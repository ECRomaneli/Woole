app.component('RecordViewer', {
    template: /*html*/ `
        <div id="record-viewer">
            <box label-img="request" label="Request" class="record-pane">
                <template #buttons>
                    <button type="button" class="btn btn-sm" @click="openCurlViewer()">cURL</button>
                    <div class="btn-group ms-2 me-2">
                        <button type="button" class="btn btn-sm" @click="$bus.trigger('record.replay', record)">Replay</button>
                        <button type="button" class="btn btn-sm" @click="$refs.reqEditor.show()">w/ Changes</button>
                    </div>
                    <a v-if="record.request.method.toLowerCase() === 'get'" class="btn btn-sm lh-1" :href="getFullUrl()" target="_blank" title="Open in a new tab">
                        <img class="svg-icon square-16" :src="$image.src('windows2')" alt="redirect">
                    </a>
                </template>
                <template #body>
                    <record-item 
                        :titleGroup="[record.request.method, record.request.url, record.request.proto, getFullUrl()]" 
                        :item="record.request">
                    </record-item>
                </template>
            </box>
            <box label-img="response" label="Response" class="record-pane">
                <template #body>
                    <record-item 
                        :titleGroup="[record.response.code, $constants.HTTP_STATUS_MESSAGE[record.response.code], record.response.proto]" 
                        :item="record.response">
                    </record-item>
                </template>
            </box>
            <request-editor ref="reqEditor" :originalRequest="record.request"></request-editor>
            <code-viewer ref='curlViewer' type="shellscript" :code="record.request.curl"></code-viewer>
        </div>
    `,
    inject: ['$constants', '$woole', '$image'],
    props: { record: Object },
    methods: {
        openCurlViewer() {
            if (!this.record.request.curl) this.$woole.parseRequestToCurl(this.record)
            this.$refs.curlViewer.show()
        },
        getFullUrl() { return this.record.host + this.record.request.url }
    }
})
