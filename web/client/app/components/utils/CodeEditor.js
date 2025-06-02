app.component('CodeEditor', {
    template: /*html*/ `
        <div class='editor-container h-100'>
            <div class="editor-toolbar ps-2" v-if="isPrettyEnabled">
                <div v-if="readOnly">
                    <button class="fw-light px-2 m-1" :class="{ active: tab === 'raw' }" @click="changeTab('raw')">Raw</button>
                    <button class="fw-light px-2 m-1" :class="{ active: tab === 'pretty' }" @click="changeTab('pretty')">Pretty</button>
                </div>
                <div v-else>
                    <button class="fw-light px-2 m-1" @click="beautify(); setCode(prettyCode, false)">Beautify</button>
                </div>
            </div>
            <div ref="container" class="h-100"></div>
        </div>
    `,
    inject: [ '$beautifier' ],
    props: { type: String, code: String, 
            readOnly: { type: Boolean, default: false }, 
            minLines: { type: Number, default: 5 }, 
            maxLines: { type: Number, default: Infinity }
     },
    data() {
        return {
            typesByMode: {
                      'html': [ 'html', 'xml' ],
                       'css': [ 'css', 'sass', 'scss' ],
                'javascript': [ 'javascript', 'js' ],
                     'json5': [ 'json' ],
                        'sh': [ 'shellscript', 'sh' ]
            },
            tab: 'raw',
            prettyCode: null,
            themeElement: document.querySelector('[data-theme]')
        }
    },
    mounted() {
        this.createEditor()
        this.$bus.on('theme.change', this.updateTheme)

        this.resizeObserver = new ResizeObserver((entries) => { this.observeParentResize(entries[0]) })
        this.resizeObserver.observe(this.$refs.container)
    },
    beforeUnmount() {
        this.$bus.off('theme.change', this.updateTheme)
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect()
            this.resizeObserver = null
        }
        
        this.editor.destroy()
        this.editor = null
    },
    watch: {
        type: function (val) { this.setEditorMode(val) },
        code: function (val) { this.setCode(val) }
    },
    computed: {
        isPrettyEnabled() { return this.type && this.$beautifier.supports(this.type) }
    },
    methods: {
        createEditor() {
            const options = {
                useWorker: false,
                readOnly: this.readOnly,
                wrap: true,
                minLines: this.minLines,
                maxLines: this.maxLines,
                autoScrollEditorIntoView: true
            }
            
            try {
                this.editor = ace.edit(this.$refs.container, options)
                this.updateTheme()
                
                if (this.readOnly) {
                    this.editor.renderer.$cursorLayer.element.style.display = "none"
                }

                this.setEditorMode(this.type)
                if (this.code && this.code.length > 10000) {
                    this.setCode(this.code.substring(0, 10000))
                    setTimeout(() => { this.setCode(this.code) }, 1500)
                } else {
                    this.setCode(this.code)
                }
            } catch (e) {
                console.error('Error creating editor:', e)
            }
        },

        setEditorMode(type) {
            if (type) {
                for (const mode in this.typesByMode) {
                    if (this.typesByMode[mode].some(t => this.isType(t))) {
                        this.editor.session.setMode('ace/mode/' + mode)
                        return
                    }
                }
            }
            this.editor.session.setMode('')
        },

        getCode() {
            return this.editor.getValue()
        },

        setCode(code, resetPretty) {
            if (resetPretty !== false) {
                this.tab = 'raw'
                this.prettyCode = null
            }
            this.editor.setValue(code)
            this.editor.clearSelection()
            this.editor.gotoLine(1)
        },

        getLength() {
            return this.editor.getValue().length
        },

        observeParentResize(parent) {
            const height = parent.contentRect.height

            if (!height) { return }
            if (!this.lineHeight) { this.lineHeight = this.editor.renderer.lineHeight }

            let lines = Math.floor(height / this.lineHeight)

            if (lines < this.minLines) { lines = this.minLines }
            else if (lines > this.maxLines) { lines = this.maxLines }

            if (lines !== this.editor.getOption('maxLines')) {
                this.editor.setOption("maxLines", lines)
            }
        },

        forceUpdate() {
            this.editor.renderer.updateFull()
        },

        updateTheme() {
            this.editor.setTheme(this.themeElement.getAttribute('data-theme') === 'dark' ? 
                'ace/theme/twilight' : 'ace/theme/dawn'
            )
        },

        beautify() {
            try {
                this.prettyCode = this.$beautifier.beautify(this.type, this.getCode());
            } catch (error) {
                console.error("Error beautifying code:", error);
                this.prettyCode = this.getCode();
            }
        },

        changeTab(tab) {
            this.tab = tab
            let code = this.code

            if (tab === 'pretty') {
                if (this.prettyCode === null) { this.beautify() }
                code = this.prettyCode
            }
            
            this.editor.setValue(code)
            this.editor.clearSelection()
            this.editor.gotoLine(1)
        },

        isType(type) {
            return this.type.indexOf(type) !== -1
        }
    }
})