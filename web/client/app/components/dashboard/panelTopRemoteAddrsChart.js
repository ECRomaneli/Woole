app.component('topRemoteAddrsChart', {
    template: /*html*/ `
        <div class="chart-card">
            <div class="chart-header">
                <span class="chart-title">Top Remote Addresses</span>
                <span class="chart-subtitle">By request count</span>
            </div>
            <div class="chart-body">
                <canvas v-show="records.length" ref="canvas"></canvas>
                <span v-if="!records.length" class="no-data">No data yet</span>
            </div>
        </div>
    `,
    inject: ['$chart', '$woole'],
    props: { records: Array },
    data() { return { chart: null } },
    mounted() { this.createChart() },
    beforeUnmount() { this.chart && this.chart.destroy() },
    watch: { records() { this.updateChart() } },
    methods: {
        createChart() {
            const data = this.getData()
            this.chart = this.$chart.create(
                this.$refs.canvas, 'pie', Object.keys(data), Object.values(data), null,
                { plugins: { legend: { position: 'right' } } },
                ip => this.$bus.trigger('sidebar.search', 'remoteAddr*: "^\\\\[?' + this.$woole.escapeRegex(ip) + '(]|:|$)"')
            )
            this.$chart.colorfy(this.chart)
        },
        updateChart() {
            const data = this.getData()
            this.chart.data.labels = Object.keys(data)
            this.chart.data.datasets[0].data = Object.values(data)
            this.$chart.colorfy(this.chart)
            this.chart.update()
        },
        getData() {
            const ipCounts = {}
            this.records.forEach(r => {
                if (!r.request.remoteAddr) return
                const addr = this.$woole.parseAddress(r.request.remoteAddr)
                if (!addr?.ip) return
                ipCounts[addr.ip] = (ipCounts[addr.ip] || 0) + 1
            })
            return Object.entries(ipCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
                .reduce((o, [ip, c]) => { o[ip] = c; return o }, {})
        }
    }
})
