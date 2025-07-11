// Class whose constructor attaches an event to the passed node.
// Keypresses and backspaces modify the text entry and on_modify is called.
// If on_modify returns true, the submission is accepted.
class TypingEventHandler {
	constructor(event_node, on_modify) {
		this.value = ""
		this.on_modify = on_modify
		
		event_node.addEventListener("keypress", (e) => {
			this.attempt_set_value(this.value + e.key)
		})
		
		event_node.addEventListener("keydown", (e) => {
			if (e.key == "Backspace" && this.value.length > 0) {
				this.attempt_set_value(this.value.slice(0, -1))
			}
		})
	}
	
	attempt_set_value(new_value) {
		if (this.on_modify(new_value)) {
			this.value = new_value
		}
	}
}