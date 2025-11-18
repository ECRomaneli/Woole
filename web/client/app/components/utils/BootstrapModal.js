app.component('Modal', {
    template: /*html*/ `
    <div ref="modal" class="modal fade" data-bs-backdrop="static" :data-bs-keyboard="escButton" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true" style="display: none;">
        <div class="modal-dialog modal-dialog-scrollable">
            <div class="modal-content" :class="{ 'h-100': fitHeight }">
                <div class="modal-header">
                    <slot name="header">
                        <div class="modal-title d-inline-flex">
                            <slot name="title"></slot>
                        </div>
                    </slot>
                </div>
                <div class="modal-body d-flex flex-column">
                    <slot name="body"></slot>
                </div>
                <div class="modal-footer">
                    <slot name="footer"></slot>
                </div>
            </div>
        </div>
    </div>
    `,
    emits: [ 'show', 'hide' ],
    props: { fitHeight: { type: Boolean, default: false }, escButton: { type: Boolean, default: false } },
    data() { return { emitDelay: 100 } },
    mounted() { this.modal = new bootstrap.Modal(this.$refs.modal) },
    unmounted() {
        if (this.modal) {
            this.modal.dispose();
            this.modal = null;
        }
    },
    methods: {
        show() {
            this.modal.show()
            this.emit('show')
        },
        hide() {
            this.modal.hide()
            this.emit('hide')
        },
        emit(eventName) {
            setTimeout(() => this.$emit(eventName), this.emitDelay)
        }
    }
})