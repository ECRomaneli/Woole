app.component('MethodsChart', {
    template: /*html*/ `
        <div class="chart-card">
            <div class="chart-header">
                <span class="chart-title">HTTP Methods</span>
                <span class="chart-subtitle">Request distribution</span>
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
                this.$refs.canvas, 'doughnut', Object.keys(data), Object.values(data),
                this.getColors(Object.keys(data)),
                { plugins: { legend: { position: 'right' } }, cutout: '55%' },
                label => this.$bus.trigger('sidebar.search', 'request.method: ' + label)
            )
        },
        updateChart() {
            const data = this.getData()
            this.chart.data.labels = Object.keys(data)
            this.chart.data.datasets[0].data = Object.values(data)
            this.chart.data.datasets[0].backgroundColor = this.getColors(Object.keys(data))
            this.chart.update()
        },
        getColors(labels) {
            const c = {
                'GET':'rgba(63,185,80,.75)','POST':'rgba(83,141,247,.75)','PUT':'rgba(210,153,34,.75)',
                'DELETE':'rgba(248,81,73,.75)','PATCH':'rgba(163,113,247,.75)','HEAD':'rgba(121,192,255,.75)',
                'OPTIONS':'rgba(139,148,158,.75)'
            }
            return labels.map(m => c[m] || 'rgba(139,148,158,.5)')
        },
        getData() {
            const data = {}
            this.records.forEach(r => { data[r.request.method] = (data[r.request.method] || 0) + 1 })
            return data
        }
    }
})
