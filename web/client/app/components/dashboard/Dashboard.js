app.component('Dashboard', {
    template: /*html*/ `
        <div id="dashboard">
            <div class="dashboard-section">
                <div class="section-title">Session</div>
                <div class="dashboard-grid grid-stats">
                    <div class="stat-card accent-blue">
                        <div class="stat-label">Client ID</div>
                        <div class="stat-value" style="font-size:16px">{{ clientId }}</div>
                    </div>
                    <div class="stat-card accent-green">
                        <div class="stat-label">URL</div>
                        <div class="stat-value">
                            <a v-if="httpsUrl || httpUrl" :href="httpsUrl || httpUrl" target="_blank">{{ httpsUrl || httpUrl }}</a>
                            <a v-if="httpsUrl && httpUrl" :href="httpUrl" target="_blank" style="font-size:11px;display:block;margin-top:2px;opacity:.6">{{ httpUrl }}</a>
                            <span v-if="!httpsUrl && !httpUrl" class="stat-sub">No URL</span>
                        </div>
                    </div>
                    <div class="stat-card accent-purple">
                        <div class="stat-label">Tunnel</div>
                        <div class="stat-value" style="font-size:14px">{{ tunnelUrl }}</div>
                    </div>
                    <div class="stat-card accent-cyan">
                        <div class="stat-label">Status</div>
                        <div class="stat-value">
                            <span :class="'status-pill ' + (sessionStatusClass || '')">
                                <span class="pulse"></span>
                                {{ sessionStatus || 'UNKNOWN' }}
                            </span>
                        </div>
                        <div class="stat-sub" v-if="expireDate">
                            <template v-if="expireRemaining !== null">Expires in {{ expireRemaining | 0 }} min</template>
                            <template v-else-if="expireDate === $constants.NEVER_EXPIRE_MESSAGE">No Expiration</template>
                            <template v-else>{{ expireDate }}</template>
                        </div>
                    </div>
                </div>
            </div>
            <div class="dashboard-section">
                <div class="section-title">Metrics</div>
                <div class="dashboard-grid grid-kpi">
                    <div class="stat-card accent-blue">
                        <div class="stat-label">Total Records</div>
                        <div class="stat-value">{{ totalRecords }}<span class="stat-sub" style="margin-left:6px;font-size:12px">/ {{ maxRecords }}</span></div>
                    </div>
                    <div class="stat-card accent-green">
                        <div class="stat-label">Avg Response Time</div>
                        <div class="stat-value">{{ avgResponseTime }}<span class="stat-sub" style="margin-left:2px">ms</span></div>
                        <div class="stat-sub">Client-side</div>
                    </div>
                    <div class="stat-card accent-orange">
                        <div class="stat-label">Avg Server Time</div>
                        <div class="stat-value">{{ avgServerTime }}<span class="stat-sub" style="margin-left:2px">ms</span></div>
                        <div class="stat-sub">Server-side</div>
                    </div>
                    <div class="stat-card accent-red">
                        <div class="stat-label">Error Rate</div>
                        <div class="stat-value">{{ errorRate }}<span class="stat-sub" style="margin-left:2px">%</span></div>
                        <div class="stat-sub">4xx + 5xx responses</div>
                    </div>
                </div>
            </div>
            <div class="dashboard-section">
                <div class="section-title">Response Analysis</div>
                <div class="dashboard-grid grid-charts-row">
                    <status-chart :records="records"></status-chart>
                    <methods-chart :records="records"></methods-chart>
                    <response-time-chart :records="records"></response-time-chart>
                </div>
            </div>
            <div class="dashboard-section">
                <div class="section-title">Content &amp; Performance</div>
                <div class="dashboard-grid grid-charts-row">
                    <content-types-chart :records="records"></content-types-chart>
                    <encoding-types-chart :records="records"></encoding-types-chart>
                    <response-size-chart :records="records"></response-size-chart>
                </div>
            </div>
            <div class="dashboard-section">
                <div class="section-title">Timeline</div>
                <div class="dashboard-grid grid-wide">
                    <timeline-chart :records="records"></timeline-chart>
                </div>
            </div>
            <div class="dashboard-section">
                <div class="section-title">Traffic</div>
                <div class="dashboard-grid grid-charts-row">
                    <top-remote-addrs-chart :records="records"></top-remote-addrs-chart>
                    <top-paths-list :records="records"></top-paths-list>
                    <remote-address-list :records="records"></remote-address-list>
                </div>
            </div>
        </div>
    `,
    inject: ['$timer', '$constants'],
    props: {
        sessionDetails: { type: Object, default: () => ({}) },
        records: Array
    },
    data() {
        return {
            totalRecords: 0, avgResponseTime: 0, avgServerTime: 0, errorRate: 0,
            clientId: '-', httpUrl: null, httpsUrl: null, tunnelUrl: '-', maxRecords: '∞',
            sessionStatus: null, sessionStatusClass: '',
            expireRemaining: null, expireInterval: null, expireDate: null,
        }
    },
    mounted() { this.processRecordsData(); this.loadSessionDetails() },
    beforeUnmount() { if (this.expireInterval) { clearInterval(this.expireInterval); this.expireInterval = null } },
    watch: {
        sessionDetails: { handler() { this.loadSessionDetails() }, deep: true },
        records: { handler() { this.processRecordsData() }, deep: true }
    },
    methods: {
        processRecordsData() {
            this.totalRecords = this.records.length
            let totalResponseTime = 0, totalServerTime = 0, errorCount = 0
            this.records.forEach(record => {
                totalResponseTime += record.response.elapsed || 0
                totalServerTime += record.response.serverElapsed || 0
                if ((record.response.code || 0) >= 400) errorCount++
            })
            this.avgResponseTime = Math.round(totalResponseTime / (this.totalRecords || 1))
            this.avgServerTime = Math.round(totalServerTime / (this.totalRecords || 1))
            this.errorRate = this.totalRecords ? ((errorCount / this.totalRecords) * 100).toFixed(1) : '0.0'
        },
        loadSessionDetails() {
            this.clientId = this.sessionDetails.clientId || '-'
            this.httpUrl = this.sessionDetails.http || null
            this.httpsUrl = this.sessionDetails.https || null
            this.tunnelUrl = this.sessionDetails.tunnel || '-'
            this.maxRecords = this.sessionDetails.maxRecords || '∞'
            this.setSessionStatus()
            this.setExpireAt()
        },
        setSessionStatus() {
            this.sessionStatus = this.sessionDetails.status || this.$constants.SESSION_STATUS.CONNECTING
            switch (this.sessionStatus) {
                case this.$constants.SESSION_STATUS.CONNECTING:   this.sessionStatusClass = 'connecting'; break
                case this.$constants.SESSION_STATUS.CONNECTED:    this.sessionStatusClass = 'connected'; break
                case this.$constants.SESSION_STATUS.DISCONNECTED: this.sessionStatusClass = 'disconnected'; break
                case this.$constants.SESSION_STATUS.RECONNECTING: this.sessionStatusClass = 'reconnecting'; break
                default: this.sessionStatusClass = ''; break
            }
        },
        setExpireAt() {
            if (this.expireInterval) { clearInterval(this.expireInterval); this.expireInterval = null }
            if (this.sessionDetails.expireAt === this.$constants.NEVER_EXPIRE_MESSAGE) {
                this.expireDate = this.$constants.NEVER_EXPIRE_MESSAGE; this.expireRemaining = null; return
            }
            const expireTime = new Date(this.sessionDetails.expireAt).getTime()
            if (!expireTime) { this.expireDate = '-'; this.expireRemaining = null; return }
            if (expireTime < Date.now()) { this.expireDate = 'Expired'; this.expireRemaining = null; return }
            this.expireDate = new Date(expireTime).toLocaleString()
            this.expireRemaining = Math.max(0, (expireTime - Date.now()) / 60000)
            this.expireInterval = setInterval(() => {
                const remaining = Math.max(0, (expireTime - Date.now()) / 60000)
                if (remaining <= 0) { clearInterval(this.expireInterval); this.expireInterval = null; this.expireDate = 'Expired'; this.expireRemaining = null; return }
                this.expireRemaining = remaining
            }, 30000)
        }
    }
})
