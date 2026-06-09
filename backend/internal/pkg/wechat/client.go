package wechat

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

const apiBaseURL = "https://api.weixin.qq.com"

type Client struct {
	appID     string
	secret    string
	httpCli   *http.Client
}

func NewClient(appID, secret string) *Client {
	return &Client{
		appID:   appID,
		secret:  secret,
		httpCli: &http.Client{Timeout: 10 * time.Second},
	}
}

// Code2SessionResponse 微信 jscode2session 接口返回
type Code2SessionResponse struct {
	OpenID     string `json:"openid"`
	SessionKey string `json:"session_key"`
	UnionID    string `json:"unionid,omitempty"`
	ErrCode    int    `json:"errcode"`
	ErrMsg     string `json:"errmsg"`
}

// Code2Session 通过临时 code 换取 openid
func (c *Client) Code2Session(ctx context.Context, code string) (*Code2SessionResponse, error) {
	u, _ := url.Parse(apiBaseURL + "/sns/jscode2session")
	q := u.Query()
	q.Set("appid", c.appID)
	q.Set("secret", c.secret)
	q.Set("js_code", code)
	q.Set("grant_type", "authorization_code")
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}

	resp, err := c.httpCli.Do(req)
	if err != nil {
		return nil, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	var result Code2SessionResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("unmarshal: %w", err)
	}

	if result.ErrCode != 0 {
		return nil, fmt.Errorf("wechat err %d: %s", result.ErrCode, result.ErrMsg)
	}

	return &result, nil
}
