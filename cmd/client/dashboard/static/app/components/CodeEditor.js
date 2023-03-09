app.component('CodeEditor', {
    template: /*html*/ `<div ref="container"></div>`,
    props: { type: String, code: String, readOnly: Boolean, minLines: Number, maxLines: Number },
    data() {
        return {
            typesByMode: {
                      'html': [ 'html', 'xml' ],
                       'css': [ 'css', 'sass', 'scss' ],
                'javascript': [ 'javascript', 'js' ],
                     'json5': [ 'json' ]
            }
        }
    },
    mounted() { this.createEditor() },
    beforeUnmount() { this.editor.destroy() },
    watch: {
        type: function (val) { this.setEditorMode(val) },
        code: function (val) { this.setCode(val) }
    },
    methods: {
        createEditor() {
            this.editor = ace.edit(this.$refs.container, {
                useWorker: false,
                theme: "ace/theme/twilight",
                readOnly: this.readOnly,
                autoScrollEditorIntoView: true,
                minLines: this.minLines,
                maxLines: this.maxLines,
                wrap: true
            })
            if (this.readOnly) {
                this.editor.renderer.$cursorLayer.element.style.display = "none"
            }

            this.setEditorMode(this.type)
            this.setCode(this.code)
        },

        setEditorMode(type) {
            if (type) {
                for (const mode in this.typesByMode) {
                    if (this.typesByMode[mode].some(t => type.indexOf(t) !== -1)) {
                        this.editor.session.setMode('ace/mode/' + mode)
                        return
                    }
                }
            }
            this.editor.session.setMode('')
        },

        setCode(code) {
            this.editor.setValue(atob(code)/*, -1 to scroll top */)
            this.editor.clearSelection()
        },

        getCode() {
            return btoa(this.editor.getValue())
        },

        forceUpdate() {
            this.editor.renderer.updateFull()
        }
    }
})