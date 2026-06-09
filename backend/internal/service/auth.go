package service

import (
	"context"
	"time"

	"driver-exam-wx/config"

	"github.com/golang-jwt/jwt/v5"
)

type AuthService struct {
	cfg     *config.WeChatConfig
	jwtSecret []byte
}

func NewAuthService(cfg *config.WeChatConfig) *AuthService {
	return &AuthService{
		cfg:       cfg,
		jwtSecret: []byte(cfg.Secret), // 使用 wechat secret 作为 JWT 密钥
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

// Code2Session 调用微信接口换取 openid（占位）
func (s *AuthService) Code2Session(ctx context.Context, code string) (string, error) {
	// TODO: 调用 https://api.weixin.qq.com/sns/jscode2session
	// 返回 openid
	return "", nil
}
