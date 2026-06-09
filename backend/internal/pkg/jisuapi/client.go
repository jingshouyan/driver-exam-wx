package jisuapi

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

const apiBaseURL = "https://api.jisuapi.com/driverexam/query"

type Client struct {
	appKey  string
	httpCli *http.Client
}

func NewClient(appKey string) *Client {
	return &Client{
		appKey:  appKey,
		httpCli: &http.Client{Timeout: 30 * time.Second},
	}
}

// QueryParams 请求参数
type QueryParams struct {
	Type     string // 驾照类型，固定 C1
	Subject  int    // 科目 1 或 4
	Page     int    // 页码
	PageSize int    // 每页数量，最大 100
}

// QueryResponse 极速数据 API 返回
type QueryResponse struct {
	Status int    `json:"status"`
	Msg    string `json:"msg"`
	Result *struct {
		Total    string         `json:"total"`
		PageNum  string         `json:"pagenum"`
		PageSize string         `json:"pagesize"`
		Subject  string         `json:"subject"`
		Type     string         `json:"type"`
		Sort     string         `json:"sort"`
		List     []QuestionItem `json:"list"`
	} `json:"result"`
}

// QuestionItem 单条题目
type QuestionItem struct {
	Question string `json:"question"`
	Option1  string `json:"option1"`
	Option2  string `json:"option2"`
	Option3  string `json:"option3"`
	Option4  string `json:"option4"`
	Answer   string `json:"answer"`
	Explain  string `json:"explain"`
	Pic      string `json:"pic"`
	Type     string `json:"type"`
	Chapter  string `json:"chapter"`
}

// Query 拉取一页题目
func (c *Client) Query(ctx context.Context, params QueryParams) (*QueryResponse, error) {
	u, _ := url.Parse(apiBaseURL)
	q := u.Query()
	q.Set("appkey", c.appKey)
	q.Set("type", params.Type)
	q.Set("subject", strconv.Itoa(params.Subject))
	q.Set("pagesize", strconv.Itoa(params.PageSize))
	q.Set("pagenum", strconv.Itoa(params.Page))
	q.Set("sort", "normal")
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

	var result QueryResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("unmarshal: %w", err)
	}

	if result.Status != 0 {
		return nil, fmt.Errorf("jisuapi err %d: %s", result.Status, result.Msg)
	}

	return &result, nil
}

// QueryAll 拉取某个科目的全部题目（自动分页）
func (c *Client) QueryAll(ctx context.Context, subject int) ([]QuestionItem, error) {
	const pageSize = 100
	var all []QuestionItem

	for page := 1; ; page++ {
		resp, err := c.Query(ctx, QueryParams{
			Type:     "C1",
			Subject:  subject,
			Page:     page,
			PageSize: pageSize,
		})
		if err != nil {
			return nil, fmt.Errorf("page %d: %w", page, err)
		}

		if resp.Result == nil || len(resp.Result.List) == 0 {
			break
		}

		all = append(all, resp.Result.List...)

		// 判断是否还有下一页
		total, _ := strconv.Atoi(resp.Result.Total)
		if len(all) >= total {
			break
		}
	}

	return all, nil
}
