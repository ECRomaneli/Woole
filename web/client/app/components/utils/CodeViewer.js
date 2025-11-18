app.component('CodeViewer', {
    template: /*html*/ `
    <modal ref="modal" fit-height esc-button>
        <template #title>
            <img class="svg-icon square-24 me-2" :src="$image.src('request')" alt="request">
            <span class="h5 p-0">Code Viewer</span>
        </template>
        <template #body v-if="code">
            <code-editor ref="editor" :type="type" :code="code" read-only></code-editor>
        </template>
        <template #footer>
            <button v-if="code" type="button" class="btn btn-sm" @click="copyToClipboard()">{{ copyBtnText }}</button>
            <button type="button" class="btn btn-sm" data-bs-dismiss="modal">Close</button>
        </template>
    </modal>
    `,
    inject: [ '$clipboard', '$image' ],
    props: { type: String, code: String },
    data() { return { copyBtnText: "Copy to Clipboard" } },
    methods: {
        async copyToClipboard() {
            await this.$clipboard.writeText(this.$refs.editor.getCode())
            this.copyBtnText = "Copied!"
            setTimeout(() => this.copyBtnText = "Copy to Clipboard", 3000)
        },

        show() { this.$refs.modal.show() }
    }
})