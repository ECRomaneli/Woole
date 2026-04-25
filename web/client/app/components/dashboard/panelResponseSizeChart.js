app.component('ResponseSizeChart', {
    template: /*html*/ `
        <div class="chart-card">
            <div class="chart-header">
                <span class="chart-title">Response Size</span>
                <span class="chart-subtitle">Size distribution</span>
            </div>
            <div class="chart-body">
                <canvas v-show="records.length" ref="canvas"></canvas>
                <span v-if="!records.length" class="no-data">No data yet</span>
            </div>
        </div>
    `,
    inject: ['$chart'],
    props: { records: Array },
    data() { return { chart: null } },
    mounted() { this.createChart() },
    beforeUnmount() { this.chart && this.chart.destroy() },
    watch: { records() { this.updateChart() } },
    methods: {
        createChart() {
            const data = this.getData()
            this.chart = this.$chart.create(
                this.$refs.canvas, 'polarArea', Object.keys(data), Object.values(data),
                ['rgba(63,185,80,.6)','rgba(83,141,247,.6)','rgba(210,153,34,.6)','rgba(163,113,247,.6)','rgba(248,81,73,.6)','rgba(255,123,114,.6)'],
                {
                    plugins: { legend: { position: 'right' } },
                    scales: { r: { beginAtZero: true, ticks: { display: false } } }
                }
            )
        },
        updateChart() {
            const data = this.getData()
            this.chart.data.labels = Object.keys(data)
            this.chart.data.datasets[0].data = Object.values(data)
            this.chart.update()
        },
        getData() {
            const buckets = { '<1KB':0, '1-10KB':0, '10-100KB':0, '100KB-1MB':0, '1-10MB':0, '>10MB':0 }
            this.records.forEach(r => {
                const size = parseInt(r.response.getHeader('Content-Length', '0'), 10) || 0
                if (size < 1024) buckets['<1KB']++
                else if (size < 10240) buckets['1-10KB']++
                else if (size < 102400) buckets['10-100KB']++
                else if (size < 1048576) buckets['100KB-1MB']++
                else if (size < 10485760) buckets['1-10MB']++
                else buckets['>10MB']++
            })
            return buckets
        }
    }
})
