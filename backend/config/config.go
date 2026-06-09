package config

import (
	"fmt"

	"github.com/spf13/viper"
)

type Config struct {
	Server  ServerConfig  `mapstructure:"server"`
	MySQL   MySQLConfig   `mapstructure:"mysql"`
	JisuAPI JisuAPIConfig `mapstructure:"jisuapi"`
	WeChat  WeChatConfig  `mapstructure:"wechat"`
	Sync    SyncConfig    `mapstructure:"sync"`
}

type ServerConfig struct {
	Port int `mapstructure:"port"`
}

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

type JisuAPIConfig struct {
	Key string `mapstructure:"key"`
}

type WeChatConfig struct {
	AppID  string `mapstructure:"appid"`
	Secret string `mapstructure:"secret"`
}

type SyncConfig struct {
	Cron              string `mapstructure:"cron"`
	OnStartup         bool   `mapstructure:"on_startup"`
	RetryInterval     int    `mapstructure:"retry_interval"`
	MaxRetries        int    `mapstructure:"max_retries"`
	MinIntervalHours  int    `mapstructure:"min_interval_hours"`
}

func Load(path string) (*Config, error) {
	v := viper.New()
	v.SetConfigFile(path)
	v.SetConfigType("yaml")

	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}

	return &cfg, nil
}
