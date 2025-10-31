package adt

import (
	"bytes"
	"encoding/hex"
	"errors"
	"sync"
	"woole/pkg/rand"
)

type ClientManager struct {
	mu      sync.Mutex
	clients map[string]*Client
}

func NewClientManager() *ClientManager {
	return &ClientManager{clients: make(map[string]*Client)}
}

func (cm *ClientManager) Register(clientId string, bearer []byte, newBearer []byte) (*Client, error) {
	clientId = cm.generateClientId(clientId)

	if len(bearer) != 0 && !cm.bearerEquals(bearer, newBearer) {
		return nil, errors.New("unknown client bearer")
	}

	client := NewClient(clientId, newBearer)
	cm.put(clientId, client)

	return client, nil
}

func (cm *ClientManager) Deregister(clientId string) {
	client := cm.clients[clientId]

	client.IdleTimeout.Stop()
	close(client.RecordChannel)
	cm.put(clientId, nil)
}

func (cm *ClientManager) DeregisterOnTimeout(clientId string, callback func()) {
	client := cm.clients[clientId]

	go func() {
		<-client.IdleTimeout.C
		cm.Deregister(client.Id)
		callback()
	}()
}

func (cm *ClientManager) RecoverSession(clientId string, bearer []byte) (*Client, error) {
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

func (cm *ClientManager) Get(clientId string) *Client {
	return cm.clients[clientId]
}

func (cm *ClientManager) Exists(clientId string) bool {
	return cm.clients[clientId] != nil
}

func (cm *ClientManager) bearerEquals(bearer1 []byte, bearer2 []byte) bool {
	if len(bearer1) == 0 || len(bearer2) == 0 {
		return false
	}

	return bytes.Equal(bearer1, bearer2)
}

func (cm *ClientManager) generateClientId(clientId string) string {
	hasClientId := clientId != ""

	if !hasClientId {
		return hex.EncodeToString(rand.RandMD5(""))[:8]
	}

	if cm.Exists(clientId) {
		return clientId + "-" + hex.EncodeToString(rand.RandMD5(clientId))[:5]
	}

	return clientId
}

func (cm *ClientManager) put(clientId string, client *Client) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	cm.clients[clientId] = client
}
