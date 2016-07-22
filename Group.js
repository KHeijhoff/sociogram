var Group = {};

{
	let Person = function(first_name, last_name, gender)
	{
		this.first_name = first_name || "";
		this.last_name = last_name || "";
		this.gender = gender || "u";
		this.connections_out = [[], []];
		this.connections_in = [[], []];
		this.connections_mutual = [[], []];		
	};
	
	let description = "";
	let persons = [];
	
	// Check if index i is in range
	let InRange = function(i){ return !(i<0 || i>=persons.length); };
	
	// Remove the first occurrence of val in arr from arr 
	let RemoveFromArray = function(arr, val)
	{
		let i = arr.indexOf(val);
		if(i<0) return;
		arr.splice(i, 1);
	}
		
	// Get or set the description
	Group.GetDescription = function(){ return description; };
	Group.SetDescription = function(str){ description = str; };
	
	// Returns the number of persons in the group
	Group.GetSize = function(){ return persons.length; };
	
	// Checks if resizing the group will destroy any data
	Group.ResizingWillTruncateData = function(n)
	{
		if(n < 0) return false; // No
		if(n >= persons.length) return false;
		for(let i=persons.length-1; i>=n; --i) // Check if any properties are set for persons that will be deleted
		{
			let p = persons[i];
			let c = p.first_name || p.last_name || p.gender || p.connections_out[0].length || p.connections_out[1].length || p.connections_in[0].length || p.connections_in[1].length || p.connections_mutual[0].length || p.connections_mutual[1].length;
			if(c) return true;
		}
		return false;
	}
		
	// Change the number of persons in the group
	Group.Resize = function(n)
	{
		let truncated = Group.ResizingWillTruncateData(n);
		if(n < 0 || n == persons.length) return; // No
		for(let i=persons.length; i<n; ++i) persons[i] = new Person();
		if(persons.length > n) persons.length = n;
		if(!truncated) return; // We are done
		
		
		let Filter = function(arr)
		{
			for(let i=0; i<arr.length; ++i)
			{
				if(arr[i] < n) continue;
				arr.splice(i, 1);
				--i;
			}
		};
		
		for(let i=0; i<persons.length; ++i) // Remove all connections with deleted persons
		for(let j=0; j<2; ++j)
		{
			Filter(persons[i].connections_out[j]);
			Filter(persons[i].connections_in[j]);
			Filter(persons[i].connections_mutual[j]);
		}
	};
		
	// Retrieve properties of a person
	Group.GetFirstName = function(i){ return InRange(i)? persons[i].first_name : ""; };
	Group.GetLastName  = function(i){ return InRange(i)? persons[i].last_name  : ""; };
	Group.GetGender    = function(i){ return InRange(i)? persons[i].gender     : ""; };
	Group.GetFullName  = function(i){ return InRange(i)? persons[i].first_name + " " + persons[i].last_name : ""; };
	Group.GetPerson    = function(i)
	{ 
		if(!InRange(i)) return {};
		return {first_name:persons[i].first_name, last_name:persons[i].last_name, gender:persons[i].gender};
	};
	
	// Set properties of a person
	Group.SetFirstName = function(i, name)  { if(InRange(i)) persons[i].first_name = name; };
	Group.SetLastName  = function(i, name)  { if(InRange(i)) persons[i].last_name  = name; };
	Group.SetGender    = function(i, gender){ if(InRange(i)) persons[i].gender     = gender; };
	Group.SetPerson    = function(i, first_name, last_name, gender)
	{ 
		if(!InRange(i)) return;
		persons[i].first_name = first_name; 
		persons[i].last_name  = last_name; 
		persons[i].gender     = gender; 
	};
	
	// Get the connections for a person
	Group.GetConnectionsOut    = function(i, s){ return InRange(i)? persons[i].connections_out[s]    : []; };
	Group.GetConnectionsIn     = function(i, s){ return InRange(i)? persons[i].connections_in[s]     : []; };
	Group.GetConnectionsMutual = function(i, s){ return InRange(i)? persons[i].connections_mutual[s] : []; };
	
	// Get the type of connection between person a and person b
	Group.GetConnectionType = function(a, b, s)
	{ 
		if(!InRange(a) || !InRange(b))                       return 4; // a and/or b is out of range
		if(persons[a].connections_out[s].indexOf(b) > -1)    return 1; // Connection from a to b
		if(persons[a].connections_in[s].indexOf(b) > -1)     return 2; // Connection from b to a
		if(persons[a].connections_mutual[s].indexOf(b) > -1) return 3; // Mutual connection
		                                                     return 0; // No connection
	};

	// Add a connection from person a to person b
	Group.AddConnection = function(a, b, s)
	{
		switch(Group.GetConnectionType(a, b, s))
		{
		case 0: // Create a one sided connection from a to b
			persons[a].connections_out[s].push(b);
			persons[b].connections_in[s].push(a);
			return;
		case 1: // This connection already exists
			return;					
		case 2: // Create a mutual connection between a and b
			RemoveFromArray(persons[b].connections_out[s], a);
			RemoveFromArray(persons[a].connections_in[s], b);
			persons[a].connections_mutual[s].push(b);
			persons[b].connections_mutual[s].push(a);
			return;
		case 3: // This connection already exists
			return;
		case 4: // a and/or b is out of range
			return;
		}
	};
	
	// Remove the connection from person a to person b
	Group.RemoveConnection = function(a, b, s)
	{
		switch(Group.GetConnectionType(a, b, s))
		{
		case 0: // This connection does not exist
			return;
		case 1: // Remove the connection
			RemoveFromArray(persons[a].connections_out[s], b);
			RemoveFromArray(persons[b].connections_in[s], a);
			return;
		case 2: // This connection is only from b to a
			return;
		case 3: // Change the mutual connection to a one-sided connection from b to a
			RemoveFromArray(persons[a].connections_mutual[s], b);
			RemoveFromArray(persons[b].connections_mutual[s], a);
			persons[b].connections_out[s].push(a);
			persons[a].connections_in[s].push(b);
			return;
		case 4: // a and/or b is out of range
			return;
		}		
	};

	// Toggles the connection from person a to person b
	Group.ToggleConnection = function(a, b, s)
	{ 
		(Group.GetConnectionType(a, b, s)&1? Group.RemoveConnection : Group.AddConnection)(a, b, s);
	};
	
	// Returns al the one sided connections to a person n and between the persons connected to person n
	Group.GetDirectionalGroupConnections = function(n, s)
	{
		let m = [];
		//console.log(n, s);
		let c = persons[n].connections_mutual[s].concat(persons[n].connections_out[s], persons[n].connections_in[s]);
		
		for(let i=0; i<c.length; ++i)
		for(let j=i+1; j<c.length; ++j)
		{
			let a = c[i];
			let b = c[j];
			
			switch(Group.GetConnectionType(a, b, s))
			{
				case 1: m.push([a, b]); break;
				case 2: m.push([b, a]); break;
			}
		}

		persons[n].connections_out[s].forEach(function(i){ m.push([n, i]); });
		persons[n].connections_in[s].forEach(function(i){ m.push([i, n]); });
		
		return m;
	};	
	
	// Returns al the mutual connections with a person n and between the persons connected to person n
	Group.GetMutualGroupConnections = function(n, s)
	{
		let m = [];
		let c = persons[n].connections_mutual[s].concat(persons[n].connections_out[s], persons[n].connections_in[s]);
		
		for(let i=0; i<c.length; ++i)
		for(let j=i+1; j<c.length; ++j)
		{
			let a = c[i];
			let b = c[j];
			
			if(Group.GetConnectionType(a, b, s) != 3) continue;
			m.push([a, b]);
		}
		persons[n].connections_mutual[s].forEach(function(i){ m.push([n, i]); });
		
		return m;
	};	
	

	
	// Returns an array of all non-mutual connections
	Group.GetDirectionalConnections = function(s)
	{
		let arr = [];
		let k = 0;
		
		for(let i=0; i<persons.length; ++i)
		for(let j=0; j<persons[i].connections_out[s].length; ++j)
			arr[k++] = [i, persons[i].connections_out[s][j]];
		
		return arr;
	};
	
	// Returns an array of all mutual connections
	Group.GetMutualConnections = function(s)
	{
		let arr = [];
		let k = 0;
		
		for(let i=0; i<persons.length; ++i)
		{
			let mutual = persons[i].connections_mutual[s];
			for(let j=0; j<mutual.length; ++j)
				if(i < mutual[j])
					arr[k++] = [i, mutual[j]];
		}
		
		return arr;
	};
		
	// Exports all the data to an array that can be stored in JSON
	Group.GetData = function()
	{
		let data = new Array(persons.length);
		
		for(let i=0; i<data.length; ++i)
		{
			let p = persons[i];
			data[i] = 
			[
				p.first_name, 
				p.last_name, 
				p.gender, 
				p.connections_out[0].concat(p.connections_mutual[0]),
				p.connections_out[1].concat(p.connections_mutual[1])		
			];
		}
		
		return [description, data];
	};
	
	// Restores a group from data
	Group.SetData = function(data)
	{
		Group.Clear();
		Group.SetDescription(data[0]);
		Group.Resize(data[1].length);
		
		for(let i=0; i<data[1].length; ++i)
		{
			let p = data[1][i];
			Group.SetPerson(i, p[0], p[1], p[2]);
			for(let s=0; s<2; ++s)
			for(let j=0; j<p[3+s].length; ++j) 
				Group.AddConnection(i, p[3+s][j], s);
		}
	};
	
	Group.Clear = function()
	{
		description = "";
		persons = [];
	};
}












































