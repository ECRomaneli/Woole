app.component('SidebarItem', {
    template: /*html*/ `
        <button :client-id="record.clientId" v-bind="$attrs" class="record-item lh-sm" @mouseover="showToggle = true" @mouseleave="showToggle = false">
            <div class="item-top">
                <div class="badge-group">
                    <span class="badge" :class="methodBadge()">{{ request.method }}</span>
                    <span class="badge" :class="statusBadge()">{{ response.code }}</span>
                    <div v-if="record.type === 'redirect'" class="bg-redirect-badge badge" title="Redirect">
                        <img :src="$image.src('windows')" alt="redirect" />
                    </div>
                    <div v-else-if="record.type === 'replay'" class="bg-replay-badge badge" title="Replay">
                        <img :src="$image.src('play')" alt="replay" />
                    </div>
                </div>
                <div class="item-time">
                    <img v-show="showToggle" :src="$image.src('change')" class="svg-icon square-12 toggle-time" alt="toggle" @click="toggleInfo($event)" />
                    <template v-if="showCreatedAt">
                        <span style="opacity:.5">{{ createdAt[0] }},</span>
                        <span style="font-weight:600">{{ createdAt[1] }}</span>
                    </template>
                    <template v-else-if="response.serverElapsed">
                        <span style="opacity:.5" title="Client Elapsed Time">{{ response.elapsed }}ms /</span>
                        <span style="font-weight:600" title="Server Elapsed Time">{{ response.serverElapsed }}ms</span>
                    </template>
                    <span v-else style="font-weight:600" title="Client Elapsed Time">{{ response.elapsed }}ms</span>
                </div>
            </div>
            <div class="item-path">
                <span>{{ ellipsis(request.path) }}</span>
                <span v-if="hasQuery" class="badge bg-query" :title="requestQuery">?</span>
            </div>
        </button>
    `,
    inject: [ '$image', '$date' ],
    inheritAttrs: false,
    props: { record: Object },
    data() { return { showCreatedAt: true, showToggle: false, maxLength: 34 } },
    computed: {
        request() { return this.record.request },
        response() { return this.record.response },
        createdAt() { return this.record.createdAt.split(', ') },
        hasQuery() { return this.request.queryParams !== void 0 },
        requestQuery() { return this.hasQuery ? this.request.url.split('?')[1] : '' },
    },
    methods: {
        methodBadge() { return "bg-" + this.request.method.toLowerCase() },
        statusBadge() { return "bg-status-" + parseInt(this.response.code/100) },
        ellipsis(path) {
            let max = this.maxLength
            if (this.hasQuery) { max -= 4 }
            let result = path.length < max ? path : '...' + path.substring(path.length - max)
            return result + (this.hasQuery ? ' ' : '')
        },
        toggleInfo(e) {
            e.stopPropagation()
            this.showCreatedAt = !this.showCreatedAt
        }
    }
})
