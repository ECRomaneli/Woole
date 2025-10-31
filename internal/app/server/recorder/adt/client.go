package adt

import (
	"sync"
	"time"
	"woole/internal/pkg/tunnel"
	"woole/pkg/sequence"
)

type Client struct {
	rw            sync.RWMutex
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

func NewClient(clientId string, bearer []byte) *Client {
	client := &Client{
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

func (cl *Client) LogPrefix() string {
	logPrefix := cl.Id
	if len(cl.IpAddress) != 0 {
		logPrefix += " - From: " + cl.IpAddress
	}
	return logPrefix
}

func (cl *Client) AddRecord(rec *Record) (id string) {
	rec.Id = cl.seq.NextString()
	cl.putRecord(rec.Id, rec)
	cl.RecordChannel <- &rec.Record
	return rec.Id
}

func (cl *Client) RemoveRecord(recordId string) *Record {
	removedRecord := cl.getRecord(recordId)
	cl.putRecord(recordId, nil)
	return removedRecord
}

func (cl *Client) SendServerElapsed(rec *Record) {
	cl.RecordChannel <- rec.ThinClone(tunnel.Step_SERVER_ELAPSED)
}

func (cl *Client) SetRecordResponse(recordId string, response *tunnel.Response) {
	record := cl.getRecord(recordId)

	if record == nil {
		return
	}
	record.Step = tunnel.Step_RESPONSE
	record.Response = response
	record.OnResponse.SendLast()
}

func (cl *Client) SetIdleTimeout(duration time.Duration) bool {
	cl.IsIdle = true
	return cl.IdleTimeout.Reset(duration)
}

func (cl *Client) StopIdleTimeout() bool {
	cl.IsIdle = false
	return cl.IdleTimeout.Stop()
}

func (cl *Client) getRecord(recordId string) *Record {
	cl.rw.RLock()
	defer cl.rw.RUnlock()
	return cl.records[recordId]
}

func (cl *Client) putRecord(recordId string, record *Record) {
	cl.rw.Lock()
	defer cl.rw.Unlock()
	cl.records[recordId] = record
}

func (cl *Client) Close() {
	cl.rw.Lock()
	defer cl.rw.Unlock()
	cl.IdleTimeout.Stop()
	// cl.records = nil
	close(cl.RecordChannel)
}

func (cl *Client) SetExpireAt(expireAt time.Duration) {
	cl.rw.Lock()
	defer cl.rw.Unlock()
	cl.ExpireAt = time.Now().Add(expireAt)
}
