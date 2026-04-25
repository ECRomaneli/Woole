app.component('Box', {
    template: /*html*/ `
        <div class="box" :class="{ 'maximized': maximized, 'transparent': transparent }">
            <div class="box-header">
                <div class="d-inline-flex pe-none">
                    <img v-if="labelImg" class="svg-icon square-24 ms-2" :src="$image.src(labelImg)" :alt="label">
                    <span class="h6 align-content-center m-0 ms-2">{{ label }}</span>
                </div>
                <div class="btn-toolbar">
                    <slot name="buttons"></slot>
                    <div v-if="maximizable === true" class="maximize-btn ms-3 me-2" @click="toggleView()">
                        <img class="svg-icon square-24" :src="$image.src(maximized ? 'minimize' : 'maximize')" alt="toggle view" />
                    </div>
                </div>
            </div>
            <div class="box-body">
                <slot name="body"></slot>
            </div>
        </div>
    `,
    inject: ['$image'],
    props: { labelImg: String, label: String, transparent: Boolean, maximizable: { default: true, type: Boolean } },
    data() { return { maximized: false } },
    methods: { 
        toggleView() {
            this.maximized = !this.maximized
            setTimeout(() => window.dispatchEvent(new Event('resize')), 10)
        }
    }
})
