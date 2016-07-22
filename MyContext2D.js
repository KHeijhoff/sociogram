function MyContext2D(canvas, canvas_type)
{
	let m = [1, 0, 0, 1, 0, 0];
	let s = 1;
	let stack=[];
	let font_size = 0;	
	let path = [];
	let current_point = [];
	let is_closed = false;
	let self = this;
	let descent = 0.215; // Depends on the font, jsPDF has no way to measure it
	let isPDF = canvas_type == "pdf";
	
	
	this.strokeStyle = "#000000";
	this.fillStyle = "#000000";
	this.lineWidth = 127/360;
	this.lineJoin = "miter";
	this.lineCap = "square";
	this.font = "10pt helvetica";
	this.textBaseline = "alphabetic";
	this.textAlign = "start";
	
	
	
	let Transform = function(x, y){ return [m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]]; };
	let Inverse = function(x, y){ return Scale([m[3]*(x - m[4]) - m[2]*(y - m[5]), -m[1]*(x - m[4]) + m[0]*(y - m[5])], 1./(m[0]*m[3] - m[1]*m[2])); };
	let Add = function(a, b){ return [a[0]+b[0], a[1]+b[1]]; };
	let Dot = function(a, b){ return a[0]*b[0] + a[1]*b[1]; };
	let Scale = function(a, s){ return [s*a[0], s*a[1]]; };
	let Subtract = function(a, b){ return Add(a, Scale(b, -1)); };
	let Norm = function(a){ return Math.sqrt(Dot(a, a)); };
	let Cross = function(a, b){ return a[0]*b[1] - a[1]*b[0]; };
	let Sign = function(v){ return v<0?-1:1; };
	
	let SetColour = function(f, c)
	{
		let a = new Array(3);
		
		for(let i=0; i<3; ++i)
			a[i] = parseInt("0x"+c.slice(1+2*i, 3+2*i));
		
		f(a[0], a[1], a[2]);
	};
	
	let ParseFont = function()
	{
		let style = "normal";
		let weight = "normal";
		let size = 12;
		let family = "helvetica";
		let elements = self.font.split(",")[0].split(" ");
		let i=0;
		
		for(; i<3; ++i)
		{
			if(elements[i] == "normal") continue;
			if(/^(italic|oblique)$/.test(elements[i])){ style = elements[i]; continue; }
			if(/^(small-caps)$/.test(elements[i])){ continue; }
			if(/^(bold|bolder|lighter|\d+)$/.test(elements[i])){ weight = elements[i]; continue; }
			break;
		}
		
		elements[i] = elements[i].split("/")[0];
		let result = /^(\d+(?:\.\d*)?)(px|cm|mm|in|pt|pc)$/.exec(elements[i++]);
		if(result !== null)
			size = result[1]*{px:3/4,cm:3600/127,mm:360/127,in:72,pt:1,pc:12}[result[2]];
		
		family = elements[i];
		font_size = size;


		let tmp = parseInt(weight);

		if((isNaN(tmp) && tmp > 700) || weight=="bolder") weight = "bold";
		
		return {style:style,weight:weight,size:size,family:family};
	}
	
	let SetFont = function()
	{
		let font = ParseFont();
		let style_str = "";
		
		if(font.weight=="bold") style_str += "bold";
		if(font.style != "normal") style_str += "italic";
		if(!style_str.length) style_str = "normal";
		
		canvas.setFont(font.family, style_str);
		canvas.setFontSize(font.size);
		
		
	};
	
	let SetStyles = function()
	{
		SetColour(canvas.setDrawColor, self.strokeStyle);
		SetColour(canvas.setFillColor, self.fillStyle);
		SetColour(canvas.setTextColor, self.fillStyle);
		canvas.setLineCap(self.lineCap);
		canvas.setLineJoin(self.lineJoin);
		canvas.setLineWidth(self.lineWidth);
		SetFont();
	};

	
	let Arc = function(a0, a1)
	{
		while(Math.abs(a1 - a0) > 0.125*Math.PI) 
			Arc(a0, a0=0.5*(a0+a1));
		
		let d = 4*Math.tan(0.25*(a1 - a0))/3;
		let cos0 = Math.cos(a0);
		let cos1 = Math.cos(a1);
		let sin0 = Math.sin(a0);
		let sin1 = Math.sin(a1);
		//console.log(">>>>>>>>", a0, a1);
		//console.log(cos0 - d*sin0, sin0 + d*cos0, cos1 + d*sin1, sin1 - d*cos1, cos1, sin1);
		self.bezierCurveTo(cos0 - d*sin0, sin0 + d*cos0, cos1 + d*sin1, sin1 - d*cos1, cos1, sin1);
		return self;
	};
	
	this.beginPath = function(){ path = []; current_point = []; is_closed=false; return this; };
	this.moveTo = function(x, y){ current_point = Transform(x, y); path = [current_point.slice()]; return this; };
	this.lineTo = function(x, y){ current_point = Transform(x, y); path[path.length++] = current_point.slice(); return this; };
	this.arcTo = function(x1, y1, x2, y2, radius)
	{
		let p0 = Inverse(current_point[0], current_point[1]);
		let p1 = [x1, y1];
		let p2 = [x2, y2];
		let u  = Subtract(p0, p1); u = Scale(u, 1./Norm(u));
		let v  = Subtract(p2, p1); v = Scale(v, 1./Norm(v));
		let uv = Dot(u, v);
		let d = radius*Math.sqrt((1. + uv)/(1. - uv));
		let c  = Scale(Add(u, v), Math.sqrt(d*d + radius*radius)/Norm(Add(u, v))); 
		let a0 = Math.atan2(u[1]*d - c[1], u[0]*d - c[0]);
		let a1 = Math.atan2(v[1]*d - c[1], v[0]*d - c[0]);
				
		//console.log("center: ", Add(p1, c));
		//console.log(p0, p1, p2, u, v, uv, d, c, a0, a1);
		
		if(Cross(u, v) > 0) a1 -= (a0 > a1)? 0 : 2*Math.PI;
		else a1 += (a0 < a1)? 0 : 2*Math.PI;
		
		
			
		this.save();
		//console.log(m);
		//console.log(Transform(x1, y1));
		this.translate(x1, y1);
		//console.log(m);
		//console.log(Transform(u[0]*d, u[1]*d));
		this.lineTo(u[0]*d, u[1]*d);
		//console.log(current_point);
		this.translate(c[0], c[1]);
		this.scale(radius, radius);
		Arc(a0, a1);
		this.restore();		
		return this;
	};
	this.bezierCurveTo = function(cp1x, cp1y, cp2x, cp2y, x, y)
	{
		let p1 = Transform(cp1x, cp1y);
		let p2 = Transform(cp2x, cp2y);
		current_point = Transform(x, y);
		path[path.length++] = [p1[0], p1[1], p2[0], p2[1], current_point[0], current_point[1]];
		return this;
	};
	this.closePath = function(){ is_closed = true; return this; };


	this.translate = function(x, y){ let p=Transform(x,y); m[4] = p[0]; m[5] = p[1]; return this; };
	this.scale = function(sx, sy){ m[0]*=sx; m[1]*=sx; m[2]*=sy; m[3]*=sy; s*=Sign(sx*sy); return this; };
	this.rotate = function(a, b)
	{
		let cos = Math.cos(a);
		let sin = Math.sin(a)*s;
		let m_0_ = m[0];
		let m_2_ = m[2];
		
		m[0] = m[0]*cos - m[1]*sin;
		m[1] = m_0_*sin + m[1]*cos;
		m[2] = m[2]*cos - m[3]*sin;
		m[3] = m_2_*sin + m[3]*cos;
		
		return this;
	};
	
	/*	let font_size = 0;	
	let descent = 0.25; // Depends on the font, jsPDF has no way to measure it
	let self = this;
	
	this.strokeStyle = "#000000";
	this.fillStyle = "#000000";
	this.lineWidth = 1/doc.internal.scaleFactor;
	this.lineJoin = "miter";
	this.lineCap = "square";
	this.font = "12pt helvetica";
	this.textBaseline = "alphabetic";
	this.textAlign = "start";*/
	this.save = function()
	{ 
		stack[stack.length] = {m:m.slice(),s:s,strokeStyle:this.strokeStyle,fillStyle:this.fillStyle,lineWidth:this.lineWidth,lineJoin:this.lineJoin,lineCap:this.lineCap,font:this.font,textBaseline:this.textBaseline,textAlign:this.textAlign}; 
		//console.log(stack[stack.length-1])
		//stack[stack.length++] = {m:m.slice(),s:s}; 
		return this; 
	};
	this.restore = function()
	{
		let o = stack[stack.length-1];
		m = o.m;
		s = o.s;
		this.strokeStyle = o.strokeStyle;
		this.fillStyle = o.fillStyle;
		this.lineWidth = o.lineWidth;
		this.lineJoin = o.lineJoin;
		this.lineCap = o.lineCap;
		this.font = o.font;
		this.textBaseline = o.textBaseline;
		this.textAlign = o.textAlign;
	
		if(stack.length>1) --stack.length; 
		return this; 
	};
	
	let MakeLines = function()
	{
		let p = path[0];
		let lines = [];
		for(let i=1; i<path.length; ++i)
		{
			let line = path[i].slice();
			let q = [line[line.length-2], line[line.length-1]];
			for(let j=0; j<line.length; j+=2)
			for(let k=0; k<2; ++k)
				line[j+k] -= p[k];
			lines[lines.length++] = line;
			p = q;
		}
		return lines;
	};
	
	let MakePathDescription = function()
	{
		let p = path[0];
		let d = "M"+p[0]+" "+p[1];
		for(let i=1; i<path.length; ++i)
		{
			let line = path[i];
			
			d += line.length==2? "L" : "C";
			for(let j=0; j<line.length; ++j)
				d += (j?" ":"") + line[j];
		}
		if(is_closed) 
			d += "Z";
		//console.log(d);
		return d;
	};

	let SetAttributes = function(ele, attributes)
	{
		for(a in attributes)
			ele.setAttribute(a, attributes[a]);
	};
	
	this.stroke = isPDF? function()
	{
		SetStyles();
		canvas.lines(path[0][0], path[0][1], MakeLines(), null, "S", is_closed);
		
		return this;
	}: 
	function()
	{ 
		let d = MakePathDescription();
		let ele = document.createElementNS("http://www.w3.org/2000/svg", "path");
		SetAttributes(ele, {d:d, fill:"none", stroke:this.strokeStyle, "stroke-width":this.lineWidth, "stroke-linecap":this.lineCap, "stroke-linejoin":this.lineJoin});
		canvas.appendChild(ele);
	};
	
	
	this.fill = isPDF? function()
	{
		SetStyles();
		canvas.lines(path[0][0], path[0][1], MakeLines(), null, "F", is_closed);
		
		return this;
	}: 
	function(id)
	{ 
		let d = MakePathDescription();
		let ele = document.createElementNS("http://www.w3.org/2000/svg", "path");
		SetAttributes(ele, {d:d, fill:this.fillStyle});
		if(id) ele.setAttribute("id", id);
		canvas.appendChild(ele);
	};
	
	this.arc = function(x, y, radius, startAngle, endAngle, anticlockwise)
	{
		if(anticlockwise) while(startAngle < endAngle) endAngle -= 2*Math.PI;
		else while(endAngle < startAngle) endAngle += 2*Math.PI;
		
		this.moveTo(x + radius*Math.cos(startAngle), y + radius*Math.sin(startAngle));
		this.save().translate(x, y).scale(radius, radius);
		Arc(startAngle, endAngle);
		this.restore();
		return this;
	}
	
	this.rect = function(x, y, width, height){ return this.beginPath().save().translate(x, y).moveTo(0, 0).lineTo(width, 0).lineTo(width, height).lineTo(0, height).closePath().restore(); };
	this.fillRect = function(x, y, width, height){ return this.rect(x, y, width, height).fill(); };
	this.strokeRect = function(x, y, width, height){ return this.rect(x, y, width, height).stroke(); };
	
	let TextPDF = function(text, x, y, stroke)
	{
		let p = Transform(x, y);
		let a = -Math.atan2(m[1], m[0])*180/Math.PI;
		
		SetStyles();
		if(!/^(left|start)$/.test(self.textAlign))
		{
			let dx = -(self.textAlign == "center"? 0.5 : 1)*self.measureText(text).width;
			p = Add(p, Scale([m[0], m[1]], dx/Norm([m[0], m[1]])));
		}
		if(!/^(alphabetic|ideographic)$/.test(self.textBaseline))
		{
			let dy = s*font_size*{bottom:-descent,middle:0.5-descent,hanging:1.-2*descent,top:1-descent}[self.textBaseline]*127/360 || 0;
			p = Add(p, Scale([m[2], m[3]], dy/Norm([m[2], m[3]])));
		}
		
		canvas.text(text, p[0], p[1], {stroke:stroke}, a);
		
		return self;
	};
	
	let TextSVG = function(text, x, y, id, stroke)
	{
		let p = Transform(x, y);
		let a = Math.atan2(m[1], m[0])*180/Math.PI;
		let font = ParseFont();
		if(!/^(left|start)$/.test(self.textAlign))
		{
			
			let dx = -(self.textAlign == "center"? 0.5 : 1)*self.measureText(text).width;
			p = Add(p, Scale([m[0], m[1]], dx/Norm([m[0], m[1]])));
		}
		if(!/^(alphabetic|ideographic)$/.test(self.textBaseline))
		{
			let dy = s*font.size*{bottom:-descent,middle:0.5-descent,hanging:1.-2*descent,top:1-descent}[self.textBaseline]*127/360 || 0;
			p = Add(p, Scale([m[2], m[3]], dy/Norm([m[2], m[3]])));
		}
		
		let ele = document.createElementNS("http://www.w3.org/2000/svg", "text");
		let txt = document.createTextNode(text);
		//console.log("wat", q, p);
		SetAttributes(ele, {x:p[0], y:p[1], transform:"rotate("+a+" "+p[0]+" "+p[1]+")", "font-family":font.family, "font-size":font.size*127/360, "font-style":font.style, "font-weight":font.weight});
		SetAttributes(ele, stroke? {stroke:self.strokeStyle, "stroke-width":self.lineWidth, fill:"none"} : {fill:self.fillStyle});
		if(id) ele.setAttribute("id", id);
		ele.appendChild(txt);
		canvas.appendChild(ele);
		
				
		return self;
	};
	
	let MeasureTextSVG = function(text)
	{
		let font = ParseFont();
		let ele = document.createElementNS("http://www.w3.org/2000/svg", "text");
		let txt = document.createTextNode(text);
		let width = 0;
		
		SetAttributes(ele, {x:0, y:0, "font-family":font.family, "font-size":font.size*127/360, "font-style":font.style, "font-weight":font.weight, opacity:0});
		ele.appendChild(txt);
		canvas.appendChild(ele);
		width = ele.getBBox().width;
		canvas.removeChild(ele);
		
		return {width:width};
	};
	
	this.fillText = isPDF? function(text, x, y){ return TextPDF(text, x, y, false); } : function(text, x, y, id){ return TextSVG(text, x, y, id, false); };
	this.strokeText = isPDF? function(text, x, y){ return TextPDF(text, x, y, true); } : function(text, x, y, id){ return TextSVG(text, x, y, id, true); };
	this.measureText = isPDF? function(text){ SetStyles(); return {width:canvas.getStringUnitWidth(text)*font_size/canvas.internal.scaleFactor}; } : MeasureTextSVG;
	
	this.log = function(){ console.log("transform: ", m); };
	
	this.save();
}








































