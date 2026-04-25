app.component('EncodingTypesChart', {
    template: /*html*/ `
        <div class="chart-card">
            <div class="chart-header">
                <span class="chart-title">Encoding Types</span>
                <span class="chart-subtitle">Content-Encoding distribution</span>
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
                this.$refs.canvas, 'doughnut', Object.keys(data), Object.values(data), null,
                { plugins: { legend: { position: 'right' } }, cutout: '55%' },
                label => this.$bus.trigger('sidebar.search', label === 'uncompressed' ? 'not content-encoding' : 'content-encoding: ' + label)
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
            const data = {}
            this.records.forEach(r => {
                const enc = r.response.getHeader('Content-Encoding', 'uncompressed')
                data[enc] = (data[enc] || 0) + 1
            })
            return data
        }
    }
})
