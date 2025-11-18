app.component('RecordItem', {
    template: /*html*/ `
        <div class="highlighted-group input-group mb-3" @mouseover="enableCopy = true" @mouseleave="enableCopy = false">
            <span class="input-group-text">{{ titleGroup[0] }}</span>
            <input type="text" class="form-control" disabled :value="titleGroup[1]">
            
            <button v-if="titleGroup[3]" class="btn img-btn" @click="$clipboard.writeText(titleGroup[3])" title="Copy">
                <Transition name="fast-fade">
                    <img v-show="enableCopy" class="svg-icon square-16 ms-2 me-2" :src="$image.src('copy')" alt="copy">
                </Transition>
            </button>
            
            <span v-if="titleGroup[2]" class="input-group-text">{{ titleGroup[2] }}</span>
        </div>

        <ul class="inline-tabs">
        <li @click="tab = 'raw'">
                <button class="tab" :class="{ active: tab === 'raw' }">Raw</button>
            </li>
            <li v-if="hasHeader" @click="tab = 'header'">
                <button class="tab" :class="{ active: tab === 'header' }">Header</button>
            </li>
            <li v-if="hasParam" @click="tab = 'param'">
                <button class="tab" :class="{ active: tab === 'param' }">Params</button>
            </li>
            <li v-if="hasBody" @click="tab = 'body'; $refs.codeEditor.forceUpdate()">
                <button class="tab" :class="{ active: tab === 'body' }">
                    Body <span v-if="hasBody" class="badge fw-light" style="font-size:.6rem">{{ bodySize }}</span>
                </button>
            </li>

            <li v-if="isPreviewSupported" @click="tab = 'preview'">
                <button class="tab" :class="{ active: tab === 'preview' }">Preview</button>
            </li>
        </ul>

        <div class="tab-content overflow-auto h-100">
            <div class="tab-pane show" :class="{ active: tab === 'raw' }">
                <map-table :map="item" :supress="['header', 'body', 'b64Body']"></map-table>
            </div>
            <div class="tab-pane show" :class="{ active: tab === 'header' }">
                <map-table :map="item.header"></map-table>
            </div>

            <div class="tab-pane" :class="{ active: tab === 'param' }">
                <map-table :map="item.queryParams"></map-table>
            </div>

            <div class="tab-pane pt-3 h-100" :class="{ active: tab === 'body' }">
                <code-editor ref="codeEditor" class="record-body" :type="content.type" :code="item.body" read-only></code-editor>
            </div>

            <div class="tab-pane pt-3 h-100" :class="{ active: tab === 'preview' }">
                <base64-viewer :category="content.category" :type="content.type" :data="item.b64Body"></base64-viewer>
            </div>
        </div>
    `,
    inject: ['$woole', '$image', '$clipboard'],
    props: { titleGroup: Array, item: Object },
    data() { return {
        supportedPreviews: ['image', 'video', 'audio'],
        tab: 'header',
        enableCopy: false
        }
    },
    watch: { item: { handler() { this.selectAvailableTab() }, deep: true } },
    computed: {
        hasHeader() { return this.item.header && Object.keys(this.item.header).length > 0 },
        hasParam() { return this.item.queryParams && Object.keys(this.item.queryParams).length > 0 },
        hasBody() { return this.item.body },
        content() {
            if (!this.hasHeader) { return {} }
            const contentType = this.item.header['Content-Type']
            return contentType ? this.$woole.parseContentType(contentType) : {}
        },
        isPreviewSupported() {
            return this.hasBody && this.supportedPreviews.some(c => c === this.content.category)
        },
        bodySize() {
            return this.$woole.parseSize(parseInt(this.hasHeader && this.item.header['Content-Length']) || this.item.body.length)
        },
    },
    methods: { 
        selectAvailableTab() {
            let availableTabs = []
            this.isPreviewSupported   && availableTabs.push('preview')
            this.hasBody              && availableTabs.push('body')
            this.hasParam             && availableTabs.push('param')
            this.hasHeader            && availableTabs.push('header')
            availableTabs.push('raw')

            if (!availableTabs.some(tab => this.tab === tab)) {
                this.tab = availableTabs.length ? availableTabs[0] : 'raw'
            }
        },

        async copyUrl() {
            await navigator.clipboard.writeText(this.titleGroup[1])
        }
    }
})
