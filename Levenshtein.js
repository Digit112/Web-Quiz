class LevenshteinMatrix {
	constructor(a, b, max=Infinity, debug=false) {
		this.a = a
		this.b = b
		this.max = max
		this.debug = debug
		
		this.value = null
		
		if (this.debug) {
			this.debug_str = "    "
			for (let i = 0; i < this.b.length; i++) {
				this.debug_str += "  " + this.b[i]
			}
			this.debug_str += "\n "
			for (let i = 0; i <= this.b.length; i++) {
				this.debug_str += String(i).padStart(3)
			}
			this.debug_str += "\n"
		}
		
		// The last row which we finished calculating.
		this.last_full_row = 0
		
		this.row_pair = [null, []]
		
		for (let r = 1; r <= a.length; r++) {
			let cmin = this.get_min_c(r)
			let cmax = this.get_max_c(r)
			
//			console.log("Calculating [" + r + ", " + cmin + "] to [" + r + ", " + cmax + "]...")
			for (let c = cmin; c <= cmax; c++) {
				let a_char = this.a[r - 1]
				let b_char = this.b[c - 1]
				
				let substitution_cost = 1
				if (a_char == b_char) {
					substitution_cost = 0
				}
				
				let lev_ins = this.get(r,   c-1) + 1
				let lev_del = this.get(r-1, c  ) + 1
				let lev_sub = this.get(r-1, c-1) + substitution_cost
				
				console.assert(!isNaN(lev_ins), "ins: " + lev_ins + ", del: " + lev_del + ", sub: " + lev_sub)
				console.assert(!isNaN(lev_del), "ins: " + lev_ins + ", del: " + lev_del + ", sub: " + lev_sub)
				console.assert(!isNaN(lev_sub), "ins: " + lev_ins + ", del: " + lev_del + ", sub: " + lev_sub)
				
				this.row_pair[1].push(Math.min(lev_ins, lev_del, lev_sub))
			}
			
			this.advance_rows()
		}
		
		if (this.debug) console.log(this.debug_str)
		
		this.value = this.row_pair[0][this.row_pair[0].length-1]
		if (this.value > this.max) this.value = Infinity
	}
	
	// Gives the index into this.row_pair[r] which produces the value expected at row_pair[r, c]
	// Allows accessing the diagonals as if this were a full matrix.
	offset_c_coord(r, c) {
		return c - Math.max(r - this.max, 1)
	}
	
	// Gives the index into this.row_pair which produces the expected row
	offset_r_coord(r) {
		return r - this.last_full_row
	}
	
	// Gets the minimum writable column index on this row.
	get_min_c(r) {
		return Math.max(r - this.max, 1)
	}
	
	// Gets the maximum writable column index on this row.
	get_max_c(r) {
		return Math.min(r + this.max, this.b.length)
	}
	
	// Gets the Levenshtein distance between the prefixes of lengths r and c of the strings in question.
	get(r, c) {
		if (r < 0 || r > this.a.length) throw new Error("Invalid coordinate.")
		if (c < 0 || c > this.b.length) throw new Error("Invalid coordinate.")
		
		if (r < this.last_full_row) throw new Error("Row already discarded.")
		if (r > this.last_full_row + 1) throw new Error("Row not yet generated.")
		
		// Left and Top walls of matrix.
		if (c == 0) return r
		if (r == 0) return c
		
		// Outside the matrix's diagonals.
		if (Math.abs(r - c) > this.max) return Infinity
		
		c = this.offset_c_coord(r, c)
		r = this.offset_r_coord(r)
		
//		console.log("Accessing [" + r + ", " + c + "] -> [" + r + "][" + c + "] -> " + this.row_pair[r][c])
		
		if (c >= this.row_pair[r].length) throw new Error("Cell not yet generated.")
		
		return this.row_pair[r][c]
	}
	
	advance_rows() {
		this.row_pair[0] = this.row_pair[1]
		this.row_pair[1] = []
		
		this.last_full_row++
		
		// Log the completed row.
		if (this.debug) {
			this.debug_str += this.a[this.last_full_row-1] + String(this.last_full_row).padStart(3, " ")
			for (let i = 1; i < this.get_min_c(this.last_full_row); i++) {
				this.debug_str += "  ."
			}
			for (let i = 0; i < this.row_pair[0].length; i++) {
				this.debug_str += `${this.row_pair[0][i]}`.padStart(3, " ")
			}
			for (let i = this.get_max_c(this.last_full_row); i < this.b.length; i++) {
				this.debug_str += "  ."
			}
			this.debug_str += "\n"
		}
	}
}
	
// Returns the Levenshtein distance between the passed strings.
// If the result is greater than max, return Infinity.
function Levenshtein(a, b, max=Infinity, debug=false) {
	return new LevenshteinMatrix(a, b, max, debug).value
}