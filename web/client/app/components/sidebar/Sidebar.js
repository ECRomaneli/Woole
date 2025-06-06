app.component('Sidebar', {
    template: /*html*/ `
        <nav id="sidebar" class="d-flex flex-column m-2">
            <div class="d-flex mb-2">
                <div class="d-flex me-2 sidebar-btn w-100" :class="{ active: !selectedRecord }" @click="showRecord()">
                    <img class="svg-icon square-20" :src="$image.src('view-grid')" alt="settings" title="Settings">
                </div>
                <div class="d-flex me-2 sidebar-btn w-100" @click="toggleTheme()">
                    <img class="svg-icon square-20" :src="$image.src(themeImg)" alt="theme" title="Theme">
                </div>
                <div class="d-flex me-2 sidebar-btn w-100" @click="clearRecords()">
                    <img class="svg-icon square-20" :src="$image.src('trash2')" alt="clear all" title="Clear All">
                </div>
                <div class="d-flex sidebar-btn w-100" @click="$refs.reqEditor.show()">
                    <img class="svg-icon square-20" :src="$image.src('file-signature')" alt="new request" title="New Request">
                </div>
            </div>
            <div class="d-flex mb-2">
                <input class="d-flex px-3 w-100 input-search" v-model="inputSearch" :class="{ active: inputSearch !== '' }" placeholder="Filter records" type="search" spellcheck="false">
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

                        <div v-if="isOtherHost(record, filteredRecordList[index + 1])" class="d-flex p-1 mb-2 origin">
                            <div class="smallest font-monospace text-center">
                                <span>{{ record.request.forwardedTo }}</span>
                            </div>
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
                // Remove records that are not in the range
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
