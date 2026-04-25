app.component('ResponseTimeChart', {
    template: /*html*/ `
        <div class="chart-card">
            <div class="chart-header">
                <span class="chart-title">Response Time</span>
                <span class="chart-subtitle">Distribution by bucket</span>
            </div>
            <div class="chart-body">
                <canvas v-show="records.length" ref="canvas"></canvas>
                <span v-if="!records.length" class="no-data">No data yet</span>
            </div>
        </div>
    `,
    inject: ['$chart'],
    props: { records: Array },
    data() { return { chart: null, labelToRange: {
        '0-100ms':'0-100ms','101-500ms':'101-500ms','501ms-1s':'501-1000ms',
        '1-2s':'1000-2000ms','2-5s':'2000-5000ms','5s+':'5000ms-'
    } } },
    mounted() { this.createChart() },
    beforeUnmount() { this.chart && this.chart.destroy() },
    watch: { records() { this.updateChart() } },
    methods: {
        createChart() {
            const data = this.getData()
            this.chart = this.$chart.create(
                this.$refs.canvas, 'bar', Object.keys(data), Object.values(data),
                ['rgba(63,185,80,.7)','rgba(105,192,150,.7)','rgba(210,153,34,.7)','rgba(255,159,64,.7)','rgba(248,129,102,.7)','rgba(248,81,73,.7)'],
                { indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: false } } },
                label => this.$bus.trigger('sidebar.search', 'response.elapsed~: ' + this.labelToRange[label])
            )
        },
        updateChart() {
            const data = this.getData()
            this.chart.data.labels = Object.keys(data)
            this.chart.data.datasets[0].data = Object.values(data)
            this.chart.update()
        },
        getData() {
            const data = { '0-100ms':0,'101-500ms':0,'501ms-1s':0,'1-2s':0,'2-5s':0,'5s+':0 }
            this.records.forEach(r => {
                const t = r.response.elapsed || 0
                if (t <= 100) data['0-100ms']++
                else if (t <= 500) data['101-500ms']++
                else if (t <= 1000) data['501ms-1s']++
                else if (t <= 2000) data['1-2s']++
                else if (t <= 5000) data['2-5s']++
                else data['5s+']++
            })
            return data
        }
    }
})
