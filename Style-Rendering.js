// Super simple function for rendering styled text.
function getHTML(str) {
	let root = document.createElement("text")
	let root.textContent = str
	
	render_code(root)
	for (let child of root.children) {
		render_bold(child)
	}
	for (let child of root.children) {
		for (let grandchild of child) {
			render_italics(grandchild)
		}
	}
}

function render_code(root) {
	let curr_root = root
	let code_start = curr_root.textContent.indexOf("`")
	while (code_start != -1 && code_start < curr_root.textContent.length - 1) {
		let code_end = curr_root.textContent.indexOf("`", code_start+1)
		if (code_end != -1) {
			let prefix = document.createElement("text")
			let body = document.createElement("code")
			let suffix = document.createElement("text")
			
			prefix.textContent = curr_root.textContent.slice(0, code_start)
			body.textContent = curr_root.textContent.slice(code_start+1, code_end)
			suffix.textContent = curr_root.textContent.slice(code_end+1)
			
			curr_root.replaceWith(prefix, body, suffix)
			
			curr_root = suffix // Check for more code snippets.
			let code_start = curr_root.textContent.indexOf("`")
		}
	}
}