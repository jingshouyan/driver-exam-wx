package database

import (
	"fmt"
	"log"

	"driver-exam-wx/config"
	"driver-exam-wx/internal/model"

	"gorm.io/driver/mysql"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Init(cfg *config.Config) (*gorm.DB, error) {
	var dialector gorm.Dialector

	switch cfg.Database.Driver {
	case "sqlite":
		dialector = sqlite.Open(cfg.SQLite.Path)
		log.Printf("使用 SQLite 数据库: %s", cfg.SQLite.Path)

	case "mysql":
		dialector = mysql.Open(cfg.MySQL.DSN())
		log.Printf("使用 MySQL 数据库: %s@%s:%d/%s",
			cfg.MySQL.User, cfg.MySQL.Host, cfg.MySQL.Port, cfg.MySQL.DBName)

	default:
		return nil, fmt.Errorf("不支持的数据库驱动: %s（可选: mysql, sqlite）", cfg.Database.Driver)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	// SQLite 不需要连接池配置
	if cfg.Database.Driver == "mysql" {
		sqlDB, err := db.DB()
		if err != nil {
			return nil, fmt.Errorf("get sql db: %w", err)
		}
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(100)
	}

	if err := db.AutoMigrate(
		&model.User{},
		&model.Question{},
		&model.SyncRecord{},
	); err != nil {
		return nil, fmt.Errorf("auto migrate: %w", err)
	}

	log.Println("数据库迁移完成")
	return db, nil
}
