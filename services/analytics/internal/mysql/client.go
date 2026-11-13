package mysql

import (
	"context"
	"database/sql"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

// Connect opens a MySQL pool, verifies it, and returns a disconnect function.
func Connect(ctx context.Context, dsn string) (*sql.DB, func() error, error) {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, nil, err
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		_ = db.Close()
		return nil, nil, err
	}

	return db, db.Close, nil
}
