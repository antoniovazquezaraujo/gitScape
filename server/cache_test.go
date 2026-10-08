package main

import (
	"testing"
	"time"
)

func TestCacheExpiry(t *testing.T) {
	c := newCache()
	c.Set("k", "v", 20*time.Millisecond)

	if _, ok := c.Get("k"); !ok {
		t.Fatal("la entrada debería existir recién guardada")
	}

	time.Sleep(40 * time.Millisecond)

	if _, ok := c.Get("k"); ok {
		t.Fatal("la entrada debería haber caducado")
	}
}

func TestCacheWithoutTTL(t *testing.T) {
	c := newCache()
	c.Set("inmutable", "valor", 0)

	time.Sleep(10 * time.Millisecond)

	v, ok := c.Get("inmutable")
	if !ok || v != "valor" {
		t.Fatalf("la entrada sin TTL debería persistir; ok=%v v=%v", ok, v)
	}
}

func TestCacheMiss(t *testing.T) {
	c := newCache()
	if _, ok := c.Get("no-existe"); ok {
		t.Fatal("una clave inexistente no debería devolver valor")
	}
}
