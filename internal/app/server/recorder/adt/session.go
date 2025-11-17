package adt

import (
	"sync"
	"time"
	"woole/internal/pkg/tunnel"
	"woole/pkg/sequence"
)

type Session struct {
	sync.RWMutex
	Bearer        []byte
	Id            string
	IpAddress     string
	seq           sequence.Seq
	records       map[string]*Record
	RecordChannel chan *tunnel.Record
	IdleTimeout   *time.Timer
	IsIdle        bool
	ExpireAt      time.Time
}

func NewSession(clientId string, bearer []byte) *Session {
	client := &Session{
		Id:            clientId,
		RecordChannel: make(chan *tunnel.Record, 32),
		records:       make(map[string]*Record),
		Bearer:        bearer,
		IdleTimeout:   time.NewTimer(time.Minute),
	}

	if !client.StopIdleTimeout() {
		panic("failed to connect client")
	}

	return client
}

func (session *Session) LogPrefix() string {
	logPrefix := session.Id
	if len(session.IpAddress) != 0 {
		logPrefix += " - From: " + session.IpAddress
	}
	return logPrefix
}

func (session *Session) AddRecordAndPublish(rec *Record, prefix string) (id string) {
	rec.Id = prefix + session.seq.NextString()
	session.putRecord(rec.Id, rec)
	println(rec.Id)
	session.RecordChannel <- &rec.Record
	return rec.Id
}

func (session *Session) RemoveRecord(recordId string) *Record {
	removedRecord := session.getRecord(recordId)
	session.putRecord(recordId, nil)
	return removedRecord
}

func (session *Session) SendServerElapsed(rec *Record) {
	session.RecordChannel <- rec.ThinClone(tunnel.Step_POST_RESPONSE)
}

func (session *Session) SetRecordResponse(recordId string, response *tunnel.Response) {
	record := session.getRecord(recordId)

	if record == nil {
		return
	}
	record.Step = tunnel.Step_RESPONSE
	record.Response = response
	record.OnResponse.SendLast()
}

func (session *Session) SetIdleTimeout(duration time.Duration) bool {
	session.IsIdle = true
	return session.IdleTimeout.Reset(duration)
}

func (session *Session) StopIdleTimeout() bool {
	session.IsIdle = false
	return session.IdleTimeout.Stop()
}

func (session *Session) getRecord(recordId string) *Record {
	session.RLock()
	defer session.RUnlock()
	return session.records[recordId]
}

func (session *Session) putRecord(recordId string, record *Record) {
	session.Lock()
	defer session.Unlock()
	session.records[recordId] = record
}

func (session *Session) Close() {
	session.Lock()
	defer session.Unlock()
	session.IdleTimeout.Stop()
	// session.records = nil
	close(session.RecordChannel)
}

func (session *Session) SetExpireAt(expireAt time.Duration) {
	session.Lock()
	defer session.Unlock()
	session.ExpireAt = time.Now().Add(expireAt)
}
