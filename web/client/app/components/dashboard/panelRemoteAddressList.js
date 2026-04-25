app.component('RemoteAddressList', {
    template: /*html*/ `
        <div class="table-card">
            <div class="table-header">Remote Address Details</div>
            <div class="stats-table-inner">
                <table>
                    <thead>
                        <tr>
                            <th>Address</th>
                            <th>Paths</th>
                            <th>Reqs</th>
                            <th>Size</th>
                            <th>Avg Time</th>
                            <th>Avg Server</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(d, ip) in data" :key="ip" @click="searchIp(ip)">
                            <td class="mono">{{ ip }}</td>
                            <td class="wrap">{{ d.paths }}</td>
                            <td>{{ d.count }}</td>
                            <td>{{ d.totalSize }}</td>
                            <td>{{ d.avgResponseTime }}ms</td>
                            <td>{{ d.avgServerTime }}ms</td>
                        </tr>
                        <tr v-if="!Object.keys(data).length"><td colspan="6" style="text-align:center;padding:20px;color:var(--text-tertiary)">No data yet</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `,
    inject: ['$woole'],
    props: { records: Array },
    data() { return { data: {} } },
    mounted() { this.updateData() },
    watch: { records: { handler() { this.updateData() }, deep: true } },
    methods: {
        updateData() { this.data = this.getData() },
        searchIp(ip) {
            this.$bus.trigger('sidebar.search', 'remoteAddr*: "^\\\\[?' + this.$woole.escapeRegex(ip) + '(]|:|$)"')
        },
        getData() {
            const ipData = {}
            this.records.forEach(r => {
                if (!r.request.remoteAddr || !r.request.path) return
                const ip = this.$woole.parseAddress(r.request.remoteAddr)?.ip
                const path = r.request.path
                let d = ipData[ip]
                if (!d) { d = { paths: [], totalResponseTime: 0, totalServerTime: 0, totalSize: 0, count: 0 }; ipData[ip] = d }
                if (d.paths.length < 10 && !d.paths.includes(path)) d.paths.push(path)
                d.totalResponseTime += r.response.elapsed || 0
                d.totalServerTime += r.response.serverElapsed || 0
                d.totalSize += parseInt(r.response.getHeader('Content-Length', 0), 10)
                d.count++
            })
            const result = {}
            Object.entries(ipData).forEach(([ip, d]) => {
                result[ip] = {
                    paths: d.paths.join(', ').slice(0, 360),
                    count: d.count,
                    totalSize: this.$woole.parseSize(d.totalSize),
                    avgResponseTime: Math.round(d.totalResponseTime / d.count),
                    avgServerTime: Math.round(d.totalServerTime / d.count)
                }
            })
            return result
        }
    }
})
