package tunnel

// Return only the necessary for the step
func (rec *Record) ThinClone(step Step) *Record {
	thinClone := &Record{Id: rec.Id, Step: step}

	switch step {
	case Step_RESPONSE:
		thinClone.Response = rec.Response
	case Step_REQUEST:
		thinClone.Request = rec.Request
	case Step_POST_RESPONSE:
		thinClone.Response = &Response{ServerElapsed: rec.Response.ServerElapsed}
	}

	return thinClone
}

func (rec *Record) Clone() *Record {
	clone := &Record{
		Id:       rec.Id,
		Request:  rec.Request.Clone(),
		Response: rec.Response.Clone(),
		Step:     rec.Step,
	}
	return clone
}
