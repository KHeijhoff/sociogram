var Sociogram = {};

{
	let paper_width          = 297   ; // mm
	let paper_height         = 210   ; // mm
	let paper_margin_left    =  10   ; // mm, left and right paper margins
	let paper_margin_right   =  10   ; // mm, bottom and top paper margins
	let paper_margin_bottom  =  10   ; // mm, left and right paper margins
	let paper_margin_top     =  10   ; // mm, bottom and top paper margins
	let label_spacing        =   2   ; // mm, distance between label and circle
	let circle_spacing       =   1   ; // mm, distance between connection ends and circle
	let line_width           =   0.3 ; // mm
	let arrowhead_size       =   2   ; // mm
	let connection_curvature =   0.5 ; // Value in the range [0, 1]. 0: Straight line, 1: circle, between 0 and 1: ellipse.
	let line_height          =   1.17; // In terms of font size
	let label_height         =   1.4 ; // In terms of font size
	let pdf_text_font        = "10pt helvetica";
	let pdf_title_font       = "bold 12pt helvetica";
	let svg_text_font        = "12pt helvetica";
	let svg_title_font       = "bold 14pt helvetica";
	let select_colour        = "#CC0000";
	let direct_colour        = ["#ba503a", "#50ba3a"];
	let mutual_colour        = ["#0000EE", "#EE0000"];
	let gender_colour        = {m:"#c1effc", f:"#fcceeb", u:"#E7E7E7"};
	let base_titles          = ["Negatief", "Positief"];
	
	let pdf_text_font_size  = parseInt(/(?: |^)(\d+)pt /.exec(pdf_text_font )[1])*25.4/72; // Text font size in mm for pdf
	let pdf_title_font_size = parseInt(/(?: |^)(\d+)pt /.exec(pdf_title_font)[1])*25.4/72; // Title font size in mm for pdf
	let svg_text_font_size  = parseInt(/(?: |^)(\d+)pt /.exec(svg_text_font )[1])*25.4/72; // Text font size in mm for svg
	let svg_title_font_size = parseInt(/(?: |^)(\d+)pt /.exec(svg_title_font)[1])*25.4/72; // Title font size in mm for svg
	
	let svg_width = 0;
	let svg_height = 0;
			
	let n_persons = 0;
	let labels = [];
	let angles = [];
	let active_sign = 1;
	let is_locked = false;
	let ignore_click = false;
	let selected_person = -1;
	let menu = document.getElementById("menu");
	let submenu = document.getElementById("submenu");
	let content = document.getElementById("content_sociogram");
	let svg = document.getElementById("svg_sociogram");
	
	// Returns an array of size n with elements from the callback function
	let InitialiseArray = function(n, callback)
	{
		let r = new Array(n);
		
		for(let i=0; i<n; ++i) r[i] = callback(i, n);			
		return r;
	};
	
	// This function is called before drawing a sociogram to initialise some variables
	let Prepare = function()
	{
		n_persons = Group.GetSize();
		
		// Generate the labels that go around the circle
		labels = InitialiseArray(n_persons, function(i)
		{
			return InitialiseArray(2, function(s)
			{
				let n = Group.GetConnectionsIn(i, s).length + Group.GetConnectionsMutual(i, s).length;
				let first_name = Group.GetFirstName(i).trim();
				let last_name = Group.GetLastName(i).trim();
				let last_name_abbr = last_name.length? last_name.split(/\s+/g).map(function(v){ return v[0];}).join(" ") : "";
				
				let label = first_name + " " + last_name_abbr + " (" + n + ")";
				
				return label.trim();
			});
		});
		
		// This calculate the angles of the labels around the circle and caches the sine and cosine values
		if(angles.length == n_persons) return;
		angles = InitialiseArray(n_persons, function(i)
		{
			let	a = Math.PI*(2*i + 1)/n_persons; 
			return {a:a, cos:Math.cos(a), sin:Math.sin(a)};
		});
	};

	
	// Calculates the maximum radius for which the sociogram still fits inside a box of max_width by max_height
	// The main problem is that the labels that determine the width and height of the sociogram depend on the radius
	let CalculateCircleGeometry = function(label_widths, max_width, max_height, label_height)
	{
		let radius = 0.5*label_height;    // The circle radius which will calculated below
		let h_max = [0, 0]; // Maximum widths left and right of the circle centre
		let v_max = [0, 0]; // Maximum heights below and above the circle centre
		let hmi = [-1, -1]; // Indexes of the labels that determine the maximum left and right widths 
		let vmi = [-1, -1]; // Indexes of the labels that determine the maximum bottom and top heights
		let prev_hmi = [-1, -1]; // Indexes of the labels that determined the maximum left and right widths for the previous iteration
		let prev_vmi = [-1, -1]; // Indexes of the labels that determined the maximum bottom and top heights for the previous iteration
		
		for(let i=0; i<4; ++i)
		{
			label_widths[label_widths.length] = 0;
			angles[angles.length] = {a:i*0.5*Math.PI, cos:Math.cos(i*0.5*Math.PI), sin:Math.sin(i*0.5*Math.PI)};
		}
		
		for(let k=0; k<10; ++k) // Repeat for an (arbitrary) maximum number of 10 times. This is just because I am not sure if there are edge cases in which this will get stuck in an infinite loop...
		{
			// Initialise the maximums and the indexes
			h_max = [0, 0];
			v_max = [0, 0];
			hmi = [n_persons+3, n_persons+1];
			vmi = [n_persons+2, n_persons];
			
			for(let i=0; i<n_persons+4; ++i) // Determine the maximums for the current radius
			{	
				let cos = Math.abs(angles[i].cos);	
				let sin = Math.abs(angles[i].sin);
				let hi = angles[i].sin > 0? 1 : 0; // The current label is left (0) or right (1) of the centre
				let vi = angles[i].cos > 0? 1 : 0; // The current label is below (0) or above (1) of the centre
				let h = (label_spacing + 0.5*label_height + label_widths[i])*sin + 0.5*label_height + line_width; // Contribution of the label to the width 
				let v = (label_spacing + 0.5*label_height + label_widths[i])*cos + 0.5*label_height + line_width; // Contribution of the label to the height 
				
				// Keep track of the maximum widths and heights
				if(hmi[hi] < 0 || h + radius*sin > h_max[hi] + radius*Math.abs(angles[hmi[hi]].sin)){ h_max[hi] = h; hmi[hi] = i; }
				if(vmi[vi] < 0 || v + radius*cos > v_max[vi] + radius*Math.abs(angles[vmi[vi]].cos)){ v_max[vi] = v; vmi[vi] = i; }
			}
					
			if(prev_hmi[0] == hmi[0] && prev_hmi[1] == hmi[1] && prev_vmi[0] == vmi[0] && prev_vmi[1] == vmi[1] ) break; // If the same labels determine the maximums as in the previous iteration, then we are done
			
			let r1 = (max_width - (h_max[0] + h_max[1]))/(Math.abs(angles[hmi[0]].sin) + Math.abs(angles[hmi[1]].sin)); // Calculate a maximum radius that makes the sociogram max_width wide using the labels that currently determine the maximum width
			let r2 = (max_height - (v_max[0] + v_max[1]))/(Math.abs(angles[vmi[0]].cos) + Math.abs(angles[vmi[1]].cos)); // Calculate a maximum radius that makes the sociogram max_height tall using the labels that currently determine the maximum height
			
			if(!max_width)  r1 = r2; // There is no maximum width
			if(!max_height) r2 = r1; // There is no maximum height
			radius = Math.min(r1, r2); // Take the smallest of the two calculated radi
			
			// Remember the current labels that determine the maximums
			prev_hmi = hmi.slice();
			prev_vmi = vmi.slice();
		}
		
		// Calculate and return the geometry of the circle
		let left   = h_max[0] + radius*Math.abs(angles[hmi[0]].sin);
		let right  = h_max[1] + radius*Math.abs(angles[hmi[1]].sin);
		let bottom = v_max[0] + radius*Math.abs(angles[vmi[0]].cos);
		let top    = v_max[1] + radius*Math.abs(angles[vmi[1]].cos);
		let geometry = 
		{
			radius : radius,
			left   : left,
			right  : right,
			bottom : bottom,
			top    : top,
			width  : left + right,
			height : bottom + top,
			margin_width : max_width - left - right,
			margin_height : max_height - bottom - top			
		};	
		
		label_widths.splice(n_persons, 4);
		angles.splice(n_persons, 4);
		
		return geometry;
	};
	
	/*let CalculateCircleGeometry2 = function(label_widths, max_width, max_height, label_height)
	{
		let radius = 0;
		let left = [];
		let right = [];
		let bottom = [];
		let top = [];
		let a = label_spacing + 0.5*label_height;
		let b = 0.5*label_height + line_width;
		let FindMaxElement = function(arr){ let imax=0; arr.forEach(function(v, i){ if(v[1] > arr[imax][1]) imax = i; }); return arr[imax]; };
		let FindMinElement = function(arr){ let imin=0; arr.forEach(function(v, i){ if(v[1] < arr[imin][1]) imin = i; }); return arr[imin]; }
		
		for(let i=0; i<n_persons; ++i)
		{
			let sin = angles[i].sin;
			let cos = angles[i].cos;
			
			left[left.length] = [i, a*sin + label_widths[i]*Math.min(0, sin) - b];
			right[right.length] = [i, a*sin + label_widths[i]*Math.max(0, sin) + b];
			bottom[bottom.length] = [i, a*cos + label_widths[i]*Math.min(0, cos) - b];
			top[top.length] = [i, a*cos + label_widths[i]*Math.max(0, cos) + b];
		}
		console.log([left,right, bottom, top]);
		let left_ind = FindMinElement(left)[0];
		let right_ind = FindMaxElement(right)[0];
		let bottom_ind = FindMinElement(bottom)[0];
		let top_ind = FindMaxElement(top)[0];
		left = left.filter(function(v, i){ return i == left_ind || angles[v[0]].sin <  angles[left_ind].sin;});
		right = right.filter(function(v, i){ return i == right_ind || angles[v[0]].sin >  angles[right_ind].sin;});
		bottom = bottom.filter(function(v, i){ return i == bottom_ind || angles[v[0]].cos < angles[bottom_ind].cos;});
		top = top.filter(function(v, i){ return i == top_ind || angles[v[0]].cos > angles[top_ind].cos;});
		console.log([left,right, bottom, top]);
	}*/
	
	// Draws a connection from person n1 to person n2
	let DrawConnection = function(ctx, r, n1, n2, mutual)
	{
		if(typeof(mutual) === 'undefined') mutual = false; // mutual is an optional argument that defaults to false
		
		let ta = arrowhead_size/(r - arrowhead_size - circle_spacing); // Angular offset for non mutual connections
		let a1 = angles[n1].a + (mutual? 0. : ta);
		let a2 = angles[n2].a - (mutual? 0. : ta);	
		let r_outer = r - circle_spacing;	
		let r_inner = r - circle_spacing - arrowhead_size;
		
		// Base vectors
		let ux1 = mutual?  angles[n1].cos :  Math.cos(a1);
		let uy1 = mutual? -angles[n1].sin : -Math.sin(a1);
		let ux2 = mutual?  angles[n2].cos :  Math.cos(a2);
		let uy2 = mutual? -angles[n2].sin : -Math.sin(a2);
		
		// Draw the connection
		ctx.save();		
		ctx.beginPath().moveTo(r_outer*ux1, r_outer*uy1).lineTo(r_inner*ux1, r_inner*uy1);
		
		if(connection_curvature == 0. || 2*Math.abs(n2 - n1) == n_persons) ctx.lineTo(r_inner*ux2, r_inner*uy2);  // We only need to draw a straight line
		else // Draw an ellipse 
		{
			let a = 0.5*(a2 - a1); if(a > 0.5*Math.PI) a -= Math.PI; else if(a < -0.5*Math.PI) a += Math.PI;		
			let sina = Math.sin(a);
			let cosa = Math.cos(a);
			let tana = Math.tan(a);
			
			ctx.save();
			ctx.rotate(-0.5*Math.PI-(a1 + a)).scale(1, connection_curvature);
			ctx.arcTo(0, 0, r_inner*sina, r_inner*cosa/connection_curvature, r_inner*Math.abs(sina)*Math.sqrt(1 + connection_curvature*connection_curvature*tana*tana));
			ctx.restore();
		}
		
		if(mutual) ctx.lineTo(r_outer*ux2, r_outer*uy2);
		ctx.stroke();
		ctx.restore();	
	};
	
	// Draws the arrowhead for incoming connections for person n and a circle radius of r
	let DrawArrowhead = function(ctx, r, n)
	{
		let ta = arrowhead_size/(r - arrowhead_size - circle_spacing);	
		let d = 0.5*arrowhead_size;
		let a = angles[n].a - ta;
		
		ctx.save(); 
		ctx.rotate(-a).translate(r - d - circle_spacing, 0);
		ctx.beginPath().moveTo(d, 0).lineTo(-d, d).lineTo(-d, -d).closePath().fill();
		ctx.restore();
	};
	
	let DrawOnPDF = function(ctx, sign)
	{
		// Draw title
		let list_width = 0; // Width of list (including the title)
		let description = Group.GetDescription();
		let title = base_titles[sign] + (description.length? ", "+description : "");
		
		ctx.save();
		ctx.translate(paper_margin_left, paper_margin_top + line_height*pdf_title_font_size);
		ctx.textBaseline = "bottom";
		ctx.font = pdf_title_font;
		ctx.fillText(title, 0, -0.5*(line_height - 1.)*pdf_title_font_size);
		list_width = ctx.measureText(title).width;
		
		
		// Draw list
		let number_widths = InitialiseArray(n_persons, function(i){ return ctx.measureText((i+1).toString()).width; });
		let max_number_width = Math.max.apply(null, number_widths);
		
		ctx.translate(max_number_width, 2*line_height*pdf_text_font_size - 0.5*(line_height - 1.)*pdf_text_font_size);
		ctx.font = pdf_text_font;
		for(let i=0; i<n_persons; ++i)
		{
			let full_name = Group.GetFullName(i).trim();
			let str = (i+1) + ". " + full_name;
			let w = ctx.measureText(". " + full_name).width + max_number_width;
			
			ctx.fillText((i+1) + ". " + full_name, -number_widths[i], line_height*pdf_text_font_size*i);
			if(w > list_width) list_width = w;
		}
		ctx.restore();
		
		
		// Draw the circle
		let label_widths = labels.map(function(v){ return ctx.measureText(v[sign]).width; });
		let figure_width_max = paper_width - paper_margin_left - list_width - paper_margin_right;
		let figure_height_max = paper_height - paper_margin_top - paper_margin_bottom;
		let circle_geometry = CalculateCircleGeometry(label_widths, figure_width_max, figure_height_max, label_height*pdf_text_font_size);
		
		circle_geometry.x = paper_margin_left + list_width + 0.5*circle_geometry.margin_width + circle_geometry.left;
		circle_geometry.y = paper_margin_top + 0.5*circle_geometry.margin_height + circle_geometry.top;
		ctx.save();
		ctx.translate(circle_geometry.x, circle_geometry.y).scale(1, -1);
		ctx.beginPath().arc(0, 0, circle_geometry.radius, 0, 2*Math.PI).closePath().stroke();		
		
		// Draw labels
		ctx.rotate(0.5*Math.PI);
		ctx.textBaseline = "middle";
		for(let i=0; i<n_persons; ++i)
		{
			let w = label_widths[i];
			let h = 0.5*label_height*pdf_text_font_size;
			
			ctx.save().rotate(-angles[i].a).translate(circle_geometry.radius + label_spacing + 0.5*label_height*pdf_text_font_size, 0);
			if(i >= n_persons >> 1) ctx.translate(w, 0).rotate(Math.PI);
			ctx.fillStyle = gender_colour[Group.GetGender(i)];
			ctx.beginPath().moveTo(0,-h).arcTo(w+h,-h,w+h,0,h).arcTo(w+h,h,w,h,h).arcTo(-h,h,-h,0,h).arcTo(-h,-h,0,-h,h).fill(); // Draw the label background
			ctx.fillStyle = "#000000";
			ctx.fillText(labels[i][sign], 0, 0);
			ctx.restore();
		}
		
		
		let c1 = Group.GetDirectionalConnections(sign);
		let c2 = Group.GetMutualConnections(sign);
				
		ctx.strokeStyle = ctx.fillStyle = direct_colour[sign];
		for(let i=0; i<c1.length; ++i) DrawConnection(ctx, circle_geometry.radius, c1[i][0], c1[i][1]);	
		for(let i=0; i<n_persons; ++i) if(Group.GetConnectionsIn(i, sign).length) DrawArrowhead(ctx, circle_geometry.radius, i);
		ctx.strokeStyle = ctx.fillStyle = mutual_colour[sign];
		for(let i=0; i<c2.length; ++i) DrawConnection(ctx, circle_geometry.radius, c2[i][0], c2[i][1], true);

		ctx.restore();
	};
	
	
	let SetAttributes = function(ele, attributes)
	{
		for(a in attributes)
			ele.setAttribute(a, attributes[a]);
	};
	
	let ContentDivHeight = function()
	{ 
		content.style.height = "calc(100vh - "+menu.offsetHeight+"px - 2em)"; 
		let h = content.offsetHeight; 
		content.style.height = ""; 
		return h; 
	};
	
	let DrawSVG = function()
	{
		if(HasClass(content, "hide")) return;
		Prepare();
		
		
		// Determine and set the size of the svg element
		let list_height = line_height*(svg_title_font_size + (Group.GetSize() + 1)*svg_text_font_size);	
		let content_height = Math.max(Math.ceil(list_height*480/127), ContentDivHeight());
		let svg_width = content.offsetWidth*127/480;
		let svg_height = content_height*127/480;
				
		while(svg.hasChildNodes()) svg.removeChild(svg.lastChild); // Clear the current sociogram
		SetAttributes(svg, {width:content.offsetWidth + "px", height:content_height + "px", viewBox:[0, 0, svg_width, svg_height].join(" ")}); // Set the size

		
		// Draw the sociogram
		let ctx = new MyContext2D(svg, "svg");
		
		ctx.lineWidth = line_width;
		ctx.font = svg_text_font;
				
				
		// Draw title
		let list_width = 0; // Width of list (including the title)
		let description = Group.GetDescription();
		let title = base_titles[active_sign] + (description.length? ", "+description : "");
		
		ctx.save();
		ctx.translate(0, line_height*svg_title_font_size);
		ctx.textBaseline = "bottom";
		ctx.font = svg_title_font;
		ctx.fillText(title, 0, -0.5*(line_height - 1.)*svg_title_font_size);
		list_width = ctx.measureText(title).width;
		
		
		// Draw list
		let number_widths = InitialiseArray(n_persons, function(i){ return ctx.measureText((i+1).toString()).width; });
		let max_number_width = Math.max.apply(null, number_widths);
		
		ctx.translate(max_number_width, 2*line_height*svg_text_font_size - 0.5*(line_height - 1.)*svg_text_font_size);
		ctx.font = svg_text_font;
		for(let i=0; i<n_persons; ++i)
		{
			let full_name = Group.GetFullName(i);
			let str = (i+1) + ". " + full_name;
			let w = ctx.measureText(". " + full_name).width + max_number_width;
			
			ctx.fillText((i+1) + ". " + full_name, -number_widths[i], line_height*svg_text_font_size*i);
			if(w > list_width) list_width = w;
		}
		ctx.restore();
		
		
		// Draw the circle
		let label_widths = labels.map(function(v){ return ctx.measureText(v[active_sign]).width; });
		let figure_width_max = svg_width - list_width;
		let figure_height_max = svg_height;
		let circle_geometry = CalculateCircleGeometry(label_widths, 0, figure_height_max, label_height*svg_text_font_size);

		if(circle_geometry.width + list_width > svg_width)
		{
			let content_width = Math.ceil((circle_geometry.width + list_width)*480/127);
			svg_width = content_width*127/480;
			SetAttributes(svg, {width:content_width + "px", height:content_height + "px", viewBox:[0, 0, svg_width, svg_height].join(" ")});
		}
		circle_geometry.margin_width = svg_width - list_width - circle_geometry.width;
		circle_geometry.x = list_width + 0.5*circle_geometry.margin_width + circle_geometry.left;
		circle_geometry.y = circle_geometry.top;
		
		ctx.save();
		ctx.translate(circle_geometry.x, circle_geometry.y).scale(1, -1);
		ctx.beginPath().arc(0, 0, circle_geometry.radius, 0, 2*Math.PI).closePath().stroke();	
		
		// Draw labels
		ctx.rotate(0.5*Math.PI);
		ctx.textBaseline = "middle";
		ctx.strokeStyle = select_colour;
		for(let i=0; i<n_persons; ++i)
		{
			let w = label_widths[i];
			let h = 0.5*label_height*svg_text_font_size;
			
			ctx.save().rotate(-angles[i].a).translate(circle_geometry.radius + label_spacing + 0.5*label_height*svg_text_font_size, 0);
			if(i >= n_persons >> 1) ctx.translate(w, 0).rotate(Math.PI);
			ctx.fillStyle = gender_colour[Group.GetGender(i)];
			ctx.beginPath().moveTo(0,-h).arcTo(w+h,-h,w+h,0,h).arcTo(w+h,h,w,h,h).arcTo(-h,h,-h,0,h).arcTo(-h,-h,0,-h,h).closePath().fill(); // Draw the label background
			if(selected_person == i) ctx.stroke(); 
			ctx.fillStyle = "#000000";
			ctx.fillText(labels[i][active_sign], 0, 0);
			ctx.fillStyle = "rgba(0, 0, 0, 0)";
			ctx.beginPath().moveTo(0,-h).arcTo(w+h,-h,w+h,0,h).arcTo(w+h,h,w,h,h).arcTo(-h,h,-h,0,h).arcTo(-h,-h,0,-h,h).fill("label_button_"+i); // Draw buttons
			ctx.restore();
		}
		
		
		// Draw connections
		let c1 = selected_person<0? Group.GetDirectionalConnections(active_sign) : Group.GetDirectionalGroupConnections(selected_person, active_sign);
		let c2 = selected_person<0? Group.GetMutualConnections(active_sign)      : Group.GetMutualGroupConnections(selected_person, active_sign);
		let has_arrowhead = new Array(n_persons);
				
		ctx.strokeStyle = ctx.fillStyle = direct_colour[active_sign];
		for(let i=0; i<c1.length; ++i){ DrawConnection(ctx, circle_geometry.radius, c1[i][0], c1[i][1]); has_arrowhead[c1[i][1]] = true; }
		for(let i=0; i<n_persons; ++i) if(has_arrowhead[i]) DrawArrowhead(ctx, circle_geometry.radius, i);
		
		ctx.strokeStyle = ctx.fillStyle = mutual_colour[active_sign];
		for(let i=0; i<c2.length; ++i) DrawConnection(ctx, circle_geometry.radius, c2[i][0], c2[i][1], true);
		
		// Add all the event listeners for the buttons
		for(let i=0; i<n_persons; ++i)
		{
			let i_ = i;
			let ele = document.getElementById("label_button_"+i);
			
			ele.style.cursor = "pointer";
			ele.addEventListener("click", function()
			{
				ignore_click = true;
				if(selected_person < 0) selected_person = i_;
				else if(selected_person == i_) selected_person = -1;
				else if(is_locked) selected_person = i_;
				else Group.ToggleConnection(selected_person, i_, active_sign);
				DrawSVG();
			});
		}
	};
	
	
	// Redraw the sociogram upon loading and resizing the browser
	window.addEventListener("load", DrawSVG);
	window.addEventListener("resize", DrawSVG);
	
	// Clicking the menu will not deselect a person
	menu.addEventListener("click", function(){ ignore_click = true; });
	submenu.addEventListener("click", function(){ ignore_click = true; });

	// Pressing the escape button will deselect a person
	document.addEventListener("keydown",function(event)
	{		
		if(event.keyCode != 27 || selected_person == -1) return;
		selected_person = -1;
		DrawSVG();
	});
	
	// Clicking anywhere outside a button and the menu will deselect a person when the sociogram is visible
	document.addEventListener("click", function()
	{
		if(!ignore_click && selected_person != -1 && !HasClass(content, "hide")) // The menu or a button already handled this click event, no person is selected, or the sociogram is currently invisible
		{ 
			selected_person = -1;
			DrawSVG();			
		}
		else
			ignore_click = false;
	});
	
	// This functions create a pdf with the sociograms
	Sociogram.CreatePDF = function()
	{
		let doc = new jsPDF(paper_width<paper_height?"portrait":"landscape", "mm", [paper_width, paper_height].sort());
		let ctx = new MyContext2D(doc, "pdf");
		
		ctx.lineWidth = line_width;
		ctx.font = pdf_text_font;
		
		Prepare();
		DrawOnPDF(ctx, 1);
		doc.addPage();
		DrawOnPDF(ctx, 0);
		
		return doc;
	};
	
	// This function sets which sociogram to draw and draws it
	Sociogram.Draw = function(sign)
	{
		active_sign = sign?1:0;
		DrawSVG();
	};
	
	// This function just redraws the sociogram
	Sociogram.Update = function(){ DrawSVG(); };
	
	// Lock the input
	Sociogram.SetLocked = function(locked){ is_locked = locked; };
}

































































