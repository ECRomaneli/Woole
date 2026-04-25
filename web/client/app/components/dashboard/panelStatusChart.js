app.component('StatusChart', {
    template: /*html*/ `
        <div class="chart-card">
            <div class="chart-header">
                <span class="chart-title">Status Codes</span>
                <span class="chart-subtitle">By response class</span>
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
                this.$refs.canvas, 'bar', Object.keys(data), Object.values(data),
                ['rgba(121,192,255,.7)', 'rgba(63,185,80,.7)', 'rgba(210,153,34,.7)', 'rgba(248,81,73,.7)', 'rgba(255,123,114,.7)'],
                {
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { footer: (items) => {
                            const labels = { '1xx':'Informational','2xx':'Success','3xx':'Redirection','4xx':'Client Error','5xx':'Server Error' }
                            return labels[items[0].label] || ''
                        }}}
                    },
                    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                },
                label => this.$bus.trigger('sidebar.search', 'response.codeGroup: ' + label)
            )
        },
        updateChart() {
            const data = this.getData()
            this.chart.data.labels = Object.keys(data)
            this.chart.data.datasets[0].data = Object.values(data)
            this.chart.update()
        },
        getData() {
            const data = { '1xx': 0, '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 }
            this.records.forEach(r => {
                const g = Math.floor(r.response.code / 100) + 'xx'
                if (data[g] !== undefined) data[g]++
            })
            return data
        }
    }
})
