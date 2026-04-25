app.component('Sidebar', {
    template: /*html*/ `
        <nav id="sidebar">
            <div class="sidebar-header">
                <div class="sidebar-brand">
                    <img class="logo svg-icon" :src="$image.src('favicon')" alt="Woole">
                    <h1>Woole</h1>
                    <span class="version">Traffic Inspector</span>
                </div>

                <div class="sidebar-toolbar">
                    <div class="tool-btn" :class="{ active: !selectedRecord }" @click="showRecord()" title="Dashboard">
                        <img class="svg-icon" :src="$image.src('view-grid')" alt="dashboard">
                    </div>
                    <div class="tool-btn" @click="toggleTheme()" title="Toggle Theme">
                        <img class="svg-icon" :src="$image.src(themeImg)" alt="theme">
                    </div>
                    <div class="tool-btn" @click="clearRecords()" title="Clear All">
                        <img class="svg-icon" :src="$image.src('trash2')" alt="clear">
                    </div>
                    <div class="tool-btn" @click="$refs.reqEditor.show()" title="New Request">
                        <img class="svg-icon" :src="$image.src('file-signature')" alt="new request">
                    </div>
                </div>

                <div class="sidebar-search">
                    <input v-model="inputSearch" :class="{ active: inputSearch !== '' }" placeholder="Filter records..." type="search" spellcheck="false">
                </div>
            </div>
            
            <div id="record-list" :class="{ loading: recordList.length === 0 }">
                <div ref="scrollarea" class="scrollarea">
                    <template v-for="(record, index) in filteredRecordList">
                        
                        <sidebar-item
                            :record="record"
                            :key="record.clientId"
                            :class="{ active: isSelectedRecord(record), 'first-item': isOtherHost(record, filteredRecordList[index - 1]) }"
                            @click="showRecord(record)"
                        ></sidebar-item>

                        <div v-if="isOtherHost(record, filteredRecordList[index + 1])" class="origin-separator">
                            <span>{{ record.request.forwardedTo }}</span>
                        </div>

                    </template>
                </div>
            </div>
            <request-editor ref="reqEditor"></request-editor>
        </nav>
    `,
    inject: [ '$image', '$timer' ],
    emits: [ 'item-selected', 'filter-records' ],
    props: { maxRecords: Number },

    data() {
        return {
            recordList: [],
            filteredRecordList: [],
            selectedRecord: null,
            inputSearch: "",
            themeImg: localStorage.getItem('_woole_theme') ?? 'moon',
            appElement: document.getElementById('app'),
            excludeFromSearch: ['b64body', 'response.body'],
            postponeEmitFilterRecords: this.$timer.debounceWithThreshold(() => { this.emitFilterRecords() }, 250)
        }
    },
    beforeMount() { this.setTheme() },
    created() {
        let range = { lastEnd: null, end: null }
        let debounce = this.$timer.debounceWithThreshold(() => {
            this.recordList.sort((a, b) => b.clientId - a.clientId)
            range.end = this.recordList.length
            if (this.maxRecords && this.recordList.length > this.maxRecords) {
                this.recordList.length = this.maxRecords
                this.filterRecords(this.recordList)
                return
            }
            
            this.filterRecords(this.recordList)
            range.lastEnd = range.end
        }, 250)

        this.$bus.on('stream.start', (recs) => {
            this.recordList = recs
            range.lastEnd = this.recordList.length

            this.showRecord()
            this.filterRecords(this.recordList)
        })

        this.$bus.on('stream.new-record', (rec) => {
            this.recordList.unshift(rec)
            debounce()
        })

        this.$bus.on('stream.update-record', (update) => {
            const recordUpdated = this.recordList.some(rec => {
                if (rec.clientId === update.clientId) {
                    rec.step = update.step
                    rec.response.serverElapsed = update.response.serverElapsed
                    return true
                }
            })
            
            if (recordUpdated && this.inputSearch.indexOf('serverElapsed') !== -1) {
                this.filterRecords(this.recordList)
            }
        })

        this.$bus.on('sidebar.search', (search) => {
            if (this.inputSearch) { this.inputSearch += ` and ${search}` }
            else { this.inputSearch = search }
        })
    },

    watch: { inputSearch() { this.filterRecords(this.recordList) } },

    methods: {
        isOtherHost(record, otherRecord) {
            return otherRecord === void 0 || record.request.forwardedTo !== otherRecord.request.forwardedTo
        },

        isSelectedRecord(record) {
            return this.selectedRecord && this.selectedRecord.clientId === record.clientId
        },

        scrollTop() {
            this.$refs.scrollarea.scrollTo(0, 0)
        },

        async showRecord(record) {
            if (record === void 0) {
                if (this.selectedRecord !== null) {
                    this.selectedRecord = null
                    this.$emit('item-selected', null)
                }
                return
            }

            if (this.isSelectedRecord(record.clientId)) { return }

            this.selectedRecord = record
            this.$emit('item-selected', record)
        },

        clearRecords() {
            this.$bus.trigger('record.clear')
        },

        filterRecords(recordList) {
            this.filteredRecordList = SearchEngine.search(recordList, this.inputSearch, { excludeKeys: this.excludeFromSearch, matchChildKeysAsValues: true })
            this.postponeEmitFilterRecords()
        },

        emitFilterRecords() {
            this.$emit('filter-records', this.filteredRecordList.slice())
        },

        toggleTheme() {
            this.themeImg = this.themeImg === 'sun' ? 'moon' : 'sun'
            this.setTheme()
        },

        setTheme() {
            if (this.themeImg === 'sun') {
                this.appElement.setAttribute('data-theme', 'light')
                localStorage.setItem('_woole_theme', 'sun')
            } else {
                this.appElement.setAttribute('data-theme', 'dark')
                localStorage.setItem('_woole_theme', 'moon')
            }
            this.$bus.trigger('theme.change')
        }
    }
})
