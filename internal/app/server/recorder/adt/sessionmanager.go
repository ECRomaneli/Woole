package adt

import (
	"bytes"
	"encoding/hex"
	"errors"
	"sync"
	"woole/pkg/rand"
)

type SessionManager struct {
	mu      sync.Mutex
	clients map[string]*Session
}

func NewSessionManager() *SessionManager {
	return &SessionManager{clients: make(map[string]*Session)}
}

func (cm *SessionManager) Register(clientId string, bearer []byte, newBearer []byte) (*Session, error) {
	clientId = cm.generateClientId(clientId)

	if len(bearer) != 0 && !cm.bearerEquals(bearer, newBearer) {
		return nil, errors.New("unknown client bearer")
	}

	client := NewSession(clientId, newBearer)
	cm.put(clientId, client)

	return client, nil
}

func (cm *SessionManager) Deregister(clientId string) {
	client := cm.Get(clientId)
	client.Close()
	cm.put(clientId, nil)
}

func (cm *SessionManager) DeregisterOnTimeout(clientId string, callback func()) {
	client := cm.Get(clientId)

	go func() {
		<-client.IdleTimeout.C
		cm.Deregister(client.Id)
		callback()
	}()
}

func (cm *SessionManager) RecoverSession(clientId string, bearer []byte) (*Session, error) {
	if len(bearer) == 0 {
		return nil, nil
	}

	client := cm.Get(clientId)

	if client == nil {
		return nil, nil
	}

	if !cm.bearerEquals(client.Bearer, bearer) {
		return nil, errors.New("client bearer did not match")
	}

	return client, nil
}

func (cm *SessionManager) Get(clientId string) *Session {
	return cm.clients[clientId]
}

func (cm *SessionManager) Exists(clientId string) bool {
	return cm.clients[clientId] != nil
}

func (cm *SessionManager) bearerEquals(bearer1 []byte, bearer2 []byte) bool {
	if len(bearer1) == 0 || len(bearer2) == 0 {
		return false
	}

	return bytes.Equal(bearer1, bearer2)
}

func (cm *SessionManager) generateClientId(clientId string) string {
	hasClientId := clientId != ""

	if !hasClientId {
		return hex.EncodeToString(rand.RandMD5(""))[:8]
	}

	if cm.Exists(clientId) {
		return clientId + "-" + hex.EncodeToString(rand.RandMD5(clientId))[:5]
	}

	return clientId
}

func (cm *SessionManager) put(clientId string, client *Session) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	cm.clients[clientId] = client
}
