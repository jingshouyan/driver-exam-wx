package service

import (
	"context"
	"errors"
	"time"

	"driver-exam-wx/config"
	"driver-exam-wx/internal/model"
	"driver-exam-wx/internal/pkg/wechat"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

type AuthService struct {
	cfg       *config.WeChatConfig
	jwtSecret []byte
	wxClient  *wechat.Client
	db        *gorm.DB
}

func NewAuthService(cfg *config.WeChatConfig, db *gorm.DB) *AuthService {
	return &AuthService{
		cfg:       cfg,
		jwtSecret: []byte(cfg.Secret),
		wxClient:  wechat.NewClient(cfg.AppID, cfg.Secret),
		db:        db,
	}
}

type Claims struct {
	OpenID string `json:"openid"`
	jwt.RegisteredClaims
}

// GenerateToken 生成 JWT token，有效期 7 天
func (s *AuthService) GenerateToken(openID string) (string, error) {
	claims := Claims{
		OpenID: openID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// ValidateToken 验证 token 并返回 openid
func (s *AuthService) ValidateToken(tokenStr string) (string, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		return s.jwtSecret, nil
	})
	if err != nil {
		return "", err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return "", jwt.ErrSignatureInvalid
	}
	return claims.OpenID, nil
}

// RefreshToken 刷新 token（如果旧 token 未过期则颁发新 token）
func (s *AuthService) RefreshToken(tokenStr string) (string, error) {
	openID, err := s.ValidateToken(tokenStr)
	if err != nil {
		return "", err
	}
	return s.GenerateToken(openID)
}

// Login 微信登录：code → openid → 自动创建用户 → 返回 token
func (s *AuthService) Login(ctx context.Context, code string) (token string, openID string, err error) {
	// 1. 微信 Code2Session 换取 openid
	resp, err := s.wxClient.Code2Session(ctx, code)
	if err != nil {
		return "", "", err
	}

	// 2. 查找或创建用户
	user, err := s.findOrCreateUser(resp.OpenID)
	if err != nil {
		return "", "", err
	}

	// 3. 生成 JWT
	token, err = s.GenerateToken(user.OpenID)
	if err != nil {
		return "", "", err
	}

	return token, user.OpenID, nil
}

// findOrCreateUser 查找用户，不存在则自动创建
func (s *AuthService) findOrCreateUser(openID string) (*model.User, error) {
	var user model.User
	err := s.db.Where("openid = ?", openID).First(&user).Error
	if err == nil {
		return &user, nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// 自动创建新用户
	user = model.User{OpenID: openID}
	if err := s.db.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

// GetUser 按 openid 获取用户信息
func (s *AuthService) GetUser(openID string) (*model.User, error) {
	var user model.User
	err := s.db.Where("openid = ?", openID).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}
