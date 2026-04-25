app.component('TimelineChart', {
    template: /*html*/ `
        <div class="chart-card">
            <div class="chart-header">
                <span class="chart-title">Request Timeline</span>
                <span class="chart-subtitle">Response time over recent requests</span>
            </div>
            <div class="chart-body" style="min-height:220px">
                <canvas v-show="records.length" ref="canvas"></canvas>
                <span v-if="!records.length" class="no-data">No data yet</span>
            </div>
        </div>
    `,
    inject: ['$chart', '$date'],
    props: { records: Array },
    data() { return { chart: null } },
    mounted() { this.createChart() },
    beforeUnmount() { this.chart && this.chart.destroy() },
    watch: { records() { this.updateChart() } },
    methods: {
        createChart() {
            const { labels, clientData, serverData } = this.getData()
            this.chart = Vue.markRaw(new Chart(this.$refs.canvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Client Time (ms)',
                            data: clientData,
                            borderColor: 'rgba(83,141,247,.9)',
                            backgroundColor: 'rgba(83,141,247,.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: .3,
                            pointRadius: 2,
                            pointHoverRadius: 5
                        },
                        {
                            label: 'Server Time (ms)',
                            data: serverData,
                            borderColor: 'rgba(63,185,80,.9)',
                            backgroundColor: 'rgba(63,185,80,.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: .3,
                            pointRadius: 2,
                            pointHoverRadius: 5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } }
                    },
                    scales: {
                        x: { display: true, ticks: { maxTicksLimit: 12, font: { size: 10 } } },
                        y: { beginAtZero: true, title: { display: true, text: 'ms', font: { size: 10 } } }
                    }
                }
            }))
        },
        updateChart() {
            const { labels, clientData, serverData } = this.getData()
            this.chart.data.labels = labels
            this.chart.data.datasets[0].data = clientData
            this.chart.data.datasets[1].data = serverData
            this.chart.update()
        },
        getData() {
            const sorted = this.records.slice().sort((a, b) => a.clientId - b.clientId).slice(-60)
            return {
                labels: sorted.map(r => this.$date.from(r.createdAtMillis).format('hh:mm:ss')),
                clientData: sorted.map(r => r.response.elapsed || 0),
                serverData: sorted.map(r => r.response.serverElapsed || 0)
            }
        }
    }
})
