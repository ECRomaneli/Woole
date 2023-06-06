package dashboard

import (
	"encoding/json"
	"net/http"
	"woole/cmd/client/dashboard/adt"
	"woole/cmd/client/recorder"
	recorderAdt "woole/cmd/client/recorder/adt"
	pb "woole/shared/payload"

	"github.com/ecromaneli-golang/http/webserver"
)

// REST -> [GET] /record/stream
func connHandler(req *webserver.Request, res *webserver.Response) {
	listener, err := records.Broker.Subscribe()
	panicIfNotNil(err)
	defer records.Broker.Unsubscribe(listener)

	res.Headers(webserver.EventStreamHeader)

	res.FlushEvent(&webserver.Event{
		Name: "session",
		Data: adt.NewSessionDetails(),
	})

	res.FlushEvent(&webserver.Event{
		Name: "start",
		Data: records.ThinCloneWithoutResponseBody(),
	})

	go func() {
		for msg := range listener {
			rec := msg.(*recorderAdt.Record)

			var event *webserver.Event
			if rec.Step == pb.Step_SERVER_ELAPSED {
				event = &webserver.Event{Name: "update-record", Data: rec}
			} else {
				event = &webserver.Event{Name: "new-record", Data: rec.ThinCloneWithoutResponseBody()}
			}

			res.FlushEvent(event)
		}
	}()

	<-req.Raw.Context().Done()
}

// REST -> [GET] /record/{id}/replay
func replayHandler(req *webserver.Request, res *webserver.Response) {
	record := records.Get(req.Param("id"))
	if record == nil {
		res.Status(http.StatusNotFound).NoBody()
	} else {
		recorder.Replay(record.Request)
	}
}

// REST -> [GET] /record/{id}/request/curl
func curlHandler(req *webserver.Request, res *webserver.Response) {
	record := records.Get(req.Param("id"))
	if record == nil {
		res.Status(http.StatusNotFound).NoBody()
	} else {
		res.WriteJSON(dumpCurl(record.Request))
	}
}

// REST -> [POST] /record/request
func newRequestHandler(req *webserver.Request, res *webserver.Response) {
	newRequest := &pb.Request{}
	err := json.Unmarshal(req.Body(), newRequest)
	if err != nil {
		webserver.NewHTTPError(
			http.StatusBadRequest,
			"Error when trying to parse the new request. Reason: "+err.Error()).Panic()
	}
	recorder.Replay(newRequest)
}

// REST -> [DELETE] /record
func clearHandler(req *webserver.Request, res *webserver.Response) {
	records.RemoveAll()
}

// REST -> [GET] /record/{id}/response/body
func responseBodyHandler(req *webserver.Request, res *webserver.Response) {
	record := records.Get(req.Param("id"))
	if record == nil {
		res.Status(http.StatusNotFound).NoBody()
	} else {
		body := record.Response.Body
		res.WriteJSON(decompress(record.Response.GetHttpHeader().Get("Content-Encoding"), body))
	}
}
