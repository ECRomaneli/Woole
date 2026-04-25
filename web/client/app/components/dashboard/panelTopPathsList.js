app.component('TopPathsList', {
    template: /*html*/ `
        <div class="table-card">
            <div class="table-header">Top 10 Requested Paths</div>
            <div class="stats-table-inner">
                <table>
                    <thead>
                        <tr>
                            <th>Path</th>
                            <th style="width:55px">Count</th>
                            <th style="width:85px">Avg Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="path in data" :key="path.path" @click="searchPath(path.path)">
                            <td class="mono truncate" :title="path.path">{{ path.path }}</td>
                            <td>{{ path.count }}</td>
                            <td>{{ path.avgTime }}ms</td>
                        </tr>
                        <tr v-if="!data.length"><td colspan="3" class="no-data" style="text-align:center;padding:20px;color:var(--text-tertiary)">No data yet</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `,
    inject: ['$woole'],
    props: { records: Array },
    data() { return { data: [] } },
    mounted() { this.getData() },
    watch: { records() { this.getData() } },
    methods: {
        getData() {
            const pathMap = {}
            this.records.forEach(r => {
                const p = r.request.path
                if (!pathMap[p]) pathMap[p] = { path: p, count: 0, totalTime: 0 }
                pathMap[p].count++
                pathMap[p].totalTime += r.response.elapsed
            })
            this.data = Object.values(pathMap)
                .map(i => ({ path: i.path, count: i.count, avgTime: Math.round(i.totalTime / i.count) }))
                .sort((a, b) => b.count - a.count).slice(0, 10)
        },
        searchPath(path) {
            this.$bus.trigger('sidebar.search', 'request.path *: "^' + this.$woole.escapeRegex(path) + '$"')
        }
    }
})
