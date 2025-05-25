app.component('RequestEditor', {
    template: /*html*/ `
        <modal fit-height ref="modal" @show="prepareRequest()" @hide="removeRequest()">
            <template #title>
                <img class="svg-icon square-24 me-2" :src="$image.src('request')" alt="request">
                <span class="h5 m-0">Request</span>
            </template>
            
            <template #body v-if="request">
                <div class="highlighted-group input-group mb-3">
                    <select class="request-method input-group-text" name="method" v-model="request.method">
                        <option v-for="(method) in $constants.HTTP_METHODS" :value="method">{{ method }}</option>
                    </select>
                    <input name="url" type="text" class="form-control" spellcheck="false" aria-label="url" @blur="updateUrl()" v-model="request.url">
                </div>

                <ul class="inline-tabs">
                    <li @click="tab = 'header'">
                        <button class="tab" :class="{ active: tab === 'header' }">Header</button>
                    </li>
                    <li @click="tab = 'param'">
                        <button class="tab" :class="{ active: tab === 'param' }">Params</button>
                    </li>
                    <li @click="tab = 'body'; $refs.codeEditor.forceUpdate()">
                        <button class="tab" :class="{ active: tab === 'body' }">Body</button>
                    </li>
                </ul>

                <div class="tab-content overflow-auto h-100">
                    <div class="tab-pane" :class="{ active: tab === 'header' }">
                        <map-table ref="headerEditor" :map="request.header" :read-only="false" @update="updateHeader" @remove="removeHeader"></map-table>
                    </div>

                    <div class="tab-pane" :class="{ active: tab === 'param' }">
                        <map-table ref="queryParamsEditor" :map="request.queryParams" :read-only="false" @update="updateQueryParams" @remove="updateQueryParams"></map-table>
                    </div>

                    <div class="tab-pane h-100 pt-3" :class="{ active: tab === 'body' }">
                        <code-editor ref="codeEditor" :code="request.body" :type="content.type" :minLines="20"></code-editor>
                    </div>
                </div>
                
            </template>

            <template #footer v-if="request">
                <div class="d-flex justify-content-between align-items-center w-100">
                    <div class="ps-2">
                        <input type="checkbox" v-model="isAutoContentLengthEnabled"><label class="small-label">Calculate "Content-Length" on submit</label>
                    </div>
                    <div>
                        <button type="button" class="btn btn-sm me-2" @click="$refs.modal.hide()">Cancel</button>
                        <button type="button" class="btn btn-sm" @click="submit()">Submit</button>
                    </div>
                </div>
            </template>
        </modal>
    `,
    inject: [ '$woole', '$clone', '$constants', '$image' ],
    props: { originalRequest: Object },

    data() {
        return {
            tab: 'header',
            content: {},
            request: null,
            isAutoContentLengthEnabled: true
        }
    },

    methods: {
        async submit() {
            this.request.b64Body = this.$refs.codeEditor.getCode()
            this.request.path = new URL(this.request.url, "http://dummy").pathname
            this.request.header = this.$refs.headerEditor.toMap()

            if (this.isAutoContentLengthEnabled) {
                this.request.header['Content-Length'] = this.$refs.codeEditor.getLength() + ''
            }

            this.$bus.trigger('record.new', {
                forwardedTo: this.originalRequest?.forwardedTo,
                request: this.request
            })
            this.$refs.modal.hide()
        },

        prepareRequest() {
            if (!this.originalRequest) {
                this.request = { method: "GET", url: "", header: [], proto: "HTTP/1.1" }
                return
            }

            this.request = this.$clone(this.originalRequest)

            let contentType = this.request.header['Content-Type']
            this.updateHeader({ key: "Content-Type", value: contentType || "" })
        },

        removeRequest() { this.tab = 'header'; this.request = null },

        updateUrl() {
            this.$woole.decodeQueryParams(this.request)
        },

        updateQueryParams() {
            this.request.queryParams = this.$refs.queryParamsEditor.toMap()
            this.$woole.encodeQueryParams(this.request)
        },

        updateHeader(header) {
            if (header.key.toLowerCase() === 'content-type') {
                this.content = this.$woole.parseContentType(header.value)
            }
        },

        removeHeader(header) {
            if (header.key.toLowerCase() === 'content-type') {
                this.content = {}
            }
        },

        show() {
            this.$refs.modal.show()
        }
    }
})