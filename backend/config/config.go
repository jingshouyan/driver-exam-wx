package config

import (
	"fmt"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Log      LogConfig      `mapstructure:"log"`
	Database DatabaseConfig `mapstructure:"database"`
	MySQL    MySQLConfig    `mapstructure:"mysql"`
	SQLite   SQLiteConfig   `mapstructure:"sqlite"`
	JisuAPI  JisuAPIConfig  `mapstructure:"jisuapi"`
	WeChat   WeChatConfig   `mapstructure:"wechat"`
	Sync     SyncConfig     `mapstructure:"sync"`
}

type LogConfig struct {
	File string `mapstructure:"file"` // 日志文件路径，为空则输出到 stdout
}

type ServerConfig struct {
	Port int `mapstructure:"port"`
}

// DatabaseConfig 数据库驱动选择
type DatabaseConfig struct {
	Driver string `mapstructure:"driver"` // "mysql" 或 "sqlite"
}

// MySQLConfig MySQL 连接配置
type MySQLConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	DBName   string `mapstructure:"db_name"`
}

func (m MySQLConfig) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		m.User, m.Password, m.Host, m.Port, m.DBName)
}

// SQLiteConfig SQLite 连接配置
type SQLiteConfig struct {
	Path string `mapstructure:"path"` // 数据库文件路径，如 "data/driver_exam.db"
}

type JisuAPIConfig struct {
	Key string `mapstructure:"key"`
}

type WeChatConfig struct {
	AppID  string `mapstructure:"appid"`
	Secret string `mapstructure:"secret"`
}

type SyncConfig struct {
	Cron             string `mapstructure:"cron"`
	OnStartup        bool   `mapstructure:"on_startup"`
	RetryInterval    int    `mapstructure:"retry_interval"`
	MaxRetries       int    `mapstructure:"max_retries"`
	MinIntervalHours int    `mapstructure:"min_interval_hours"`
}

func Load(path string) (*Config, error) {
	v := viper.New()
	v.SetConfigFile(path)
	v.SetConfigType("yaml")

	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	// 默认驱动
	if !v.IsSet("database.driver") {
		v.Set("database.driver", "mysql")
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}

	return &cfg, nil
}
