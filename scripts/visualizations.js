/**
 * Visualization Components for HIMYM Transcript Visualization
 * Contains all D3.js visualization components
 */

class Visualizations {
    constructor(dataProcessor) {
      this.dataProcessor = dataProcessor;
      this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
      this.mainCharacters = [];
      this.currentSeason = "all";
    }
  
    /**
     * Initialize all visualizations
     */
    initialize() {
      if (!this.dataProcessor.isDataLoaded) {
        console.error("Data must be loaded before initializing visualizations");
        return;
      }
      
      // Get main characters
      this.mainCharacters = this.dataProcessor.getMainCharacters();
      
      // Initialize visualizations
      this.createShowOverview();
      this.createCharacterImportanceChart();
      this.createCharacterAppearanceTimeline();
      this.createWordUsageViz();
      this.createInteractionNetwork();
      
      // Initialize season selector
      this.initializeSeasonSelector();
    }
    
    /**
     * Initialize the season selector dropdown
     */
    initializeSeasonSelector() {
      const seasons = this.dataProcessor.getSeasonData();
      
      const dropdown = d3.select("#season-selector")
        .on("change", () => {
          const selectedSeason = dropdown.property("value");
          this.updateForSeason(selectedSeason);
        });
      
      dropdown.append("option")
        .attr("value", "all")
        .text("All Seasons");
      
      seasons.forEach(season => {
        dropdown.append("option")
          .attr("value", season.season)
          .text(`Season ${season.season}`);
      });
    }
    
    /**
     * Update visualizations for selected season
     * @param {string} season - Selected season (or "all")
     */
    updateForSeason(season) {
      this.currentSeason = season;
      
      // Update each visualization
      this.updateCharacterImportanceChart();
      this.updateCharacterAppearanceTimeline();
      // Update word cloud for selected character
      const select = document.getElementById("word-usage-character");
      if (select) {
        const selectedCharacter = select.value;
        this.updateWordCloud(selectedCharacter);
      }
      this.updateInteractionNetwork();
    }
    
    /**
     * Create the show overview section
     */
    createShowOverview() {
      const overviewSection = d3.select("#show-overview");
      
      overviewSection.append("h2")
        .text("How I Met Your Mother");
      
      overviewSection.append("p")
        .html(`
          <strong>How I Met Your Mother</strong> is an American sitcom that aired on CBS from 2005 to 2014, 
          spanning 9 seasons and 208 episodes. The show follows Ted Mosby (Josh Radnor) as he recounts to his 
          children the events that led him to meet their mother, through a series of flashbacks set mainly in 
          New York City. The show also follows the lives of Ted's best friends: Marshall Eriksen (Jason Segel), 
          Lily Aldrin (Alyson Hannigan), Robin Scherbatsky (Cobie Smulders), and Barney Stinson (Neil Patrick Harris).
        `);
      
      // Create season summary
      const seasons = this.dataProcessor.getSeasonData();
      
      overviewSection.append("h3")
        .text("Seasons Overview");
      
      const seasonSvg = overviewSection.append("svg")
        .attr("width", 800)
        .attr("height", 100);
      
      const seasonWidth = 700 / seasons.length;
      
      seasonSvg.selectAll("rect")
        .data(seasons)
        .enter()
        .append("rect")
        .attr("x", (d, i) => 50 + i * seasonWidth)
        .attr("y", 20)
        .attr("width", seasonWidth - 5)
        .attr("height", 30)
        .attr("fill", d => this.colorScale(d.season))
        .attr("stroke", "#333")
        .attr("stroke-width", 1);
      
      seasonSvg.selectAll("text")
        .data(seasons)
        .enter()
        .append("text")
        .attr("x", (d, i) => 50 + i * seasonWidth + seasonWidth / 2)
        .attr("y", 70)
        .attr("text-anchor", "middle")
        .text(d => `S${d.season}`);
    }
    
    /**
     * Create character importance chart (bar chart)
     */
    createCharacterImportanceChart() {
      const container = d3.select("#character-importance");
      
      container.append("h3")
        .text("Character Importance (by Line Count)");
      
      const svg = container.append("svg")
        .attr("width", 800)
        .attr("height", 400);
      
      this.characterImportanceSvg = svg;
      this.updateCharacterImportanceChart();
    }
    
    /**
     * Update character importance chart based on season selection
     */
    updateCharacterImportanceChart() {
      const svg = this.characterImportanceSvg;
      svg.selectAll("*").remove();
      
      const characters = this.mainCharacters.slice(0, 10);
      
      // Set up scales
      const margin = { top: 20, right: 20, bottom: 70, left: 70 };
      const width = +svg.attr("width") - margin.left - margin.right;
      const height = +svg.attr("height") - margin.top - margin.bottom;
      
      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
      
      // Calculate line counts by season if needed
      let lineData;
      if (this.currentSeason === "all") {
        lineData = characters.map(char => ({
          name: char.name,
          lineCount: char.lineCount
        }));
      } else {
        lineData = characters.map(char => ({
          name: char.name,
          lineCount: char.linesBySeason[this.currentSeason] || 0
        }));
      }
      
      // Sort by line count
      lineData.sort((a, b) => b.lineCount - a.lineCount);
      
      const x = d3.scaleBand()
        .domain(lineData.map(d => d.name))
        .range([0, width])
        .padding(0.2);
      
      const y = d3.scaleLinear()
        .domain([0, d3.max(lineData, d => d.lineCount)])
        .range([height, 0]);
      
      // Create bars
      g.selectAll(".bar")
        .data(lineData)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.name))
        .attr("y", d => y(d.lineCount))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.lineCount))
        .attr("fill", d => this.colorScale(d.name))
        .on("mouseover", function(event, d) {
          // Show tooltip
          d3.select("#tooltip")
            .style("display", "block")
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")
            .html(`<strong>${d.name}</strong><br>Lines: ${d.lineCount}`);
        })
        .on("mouseout", function() {
          // Hide tooltip
          d3.select("#tooltip").style("display", "none");
        });
      
      // Add axes
      g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .attr("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em");
      
      g.append("g")
        .call(d3.axisLeft(y));
      
      // Add axis labels
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${-margin.left/2},${height/2}) rotate(-90)`)
        .text("Number of Lines");
      
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${width/2},${height + margin.bottom - 10})`)
        .text("Character");
      
      // Add title
      const title = this.currentSeason === "all" 
        ? "Character Line Count (All Seasons)" 
        : `Character Line Count (Season ${this.currentSeason})`;
      
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${width/2},${-margin.top/2})`)
        .attr("font-weight", "bold")
        .text(title);
    }
    
    /**
     * Create character appearance timeline
     */
    createCharacterAppearanceTimeline() {
      const container = d3.select("#character-timeline");
      
      container.append("h3")
        .text("Character Appearances Across Episodes");
      
      // Create SVG for the timeline
      const svg = container.append("svg")
        .attr("width", 800)
        .attr("height", 300);
      
      this.characterTimelineSvg = svg;
      this.updateCharacterAppearanceTimeline();
    }
    
    /**
     * Update character appearance timeline
     */
    updateCharacterAppearanceTimeline() {
      const svg = this.characterTimelineSvg;
      svg.selectAll("*").remove();
      
      // Get episode data
      let episodes;
      if (this.currentSeason === "all") {
        // Get first 5 seasons if showing all (to avoid overcrowding)
        const allEpisodes = [];
        for (let i = 1; i <= 5; i++) {
          allEpisodes.push(...this.dataProcessor.getEpisodesBySeason(i));
        }
        episodes = allEpisodes.sort((a, b) => {
          const idA = a.id.replace("S", "").split("E");
          const idB = b.id.replace("S", "").split("E");
          
          const seasonA = parseInt(idA[0]);
          const seasonB = parseInt(idB[0]);
          
          if (seasonA !== seasonB) return seasonA - seasonB;
          return parseInt(idA[1]) - parseInt(idB[1]);
        });
      } else {
        episodes = this.dataProcessor.getEpisodesBySeason(parseInt(this.currentSeason));
      }
      
      const characters = this.mainCharacters.slice(0, 5); // Top 5 characters
      
      // Set up scales
      const margin = { top: 40, right: 20, bottom: 60, left: 70 };
      const width = +svg.attr("width") - margin.left - margin.right;
      const height = +svg.attr("height") - margin.top - margin.bottom;
      
      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
      
      // Set up scales
      const x = d3.scaleBand()
        .domain(episodes.map(d => d.id))
        .range([0, width])
        .padding(0.1);
      
      const y = d3.scaleBand()
        .domain(characters.map(d => d.name))
        .range([0, height])
        .padding(0.1);
      
      // Create heatmap cells
      characters.forEach(character => {
        episodes.forEach(episode => {
          const episodeId = episode.id;
          const lineCount = character.linesByEpisode[episodeId] || 0;
          
          // Only show if character appears in episode
          if (lineCount > 0) {
            g.append("rect")
              .attr("x", x(episodeId))
              .attr("y", y(character.name))
              .attr("width", x.bandwidth())
              .attr("height", y.bandwidth())
              .attr("fill", this.colorScale(character.name))
              .attr("opacity", Math.min(0.2 + (lineCount / 100), 1))
              .on("mouseover", function(event) {
                d3.select("#tooltip")
                  .style("display", "block")
                  .style("left", (event.pageX + 10) + "px")
                  .style("top", (event.pageY - 10) + "px")
                  .html(`<strong>${character.name}</strong><br>
                         Episode: ${episodeId}<br>
                         Lines: ${lineCount}`);
              })
              .on("mouseout", function() {
                d3.select("#tooltip").style("display", "none");
              });
          }
        });
      });
      
      // Add axes
      g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", "-.5em");
      
      g.append("g")
        .call(d3.axisLeft(y));
      
      // Add title
      const title = this.currentSeason === "all" 
        ? "Character Appearances (First 5 Seasons)" 
        : `Character Appearances (Season ${this.currentSeason})`;
      
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${width/2},${-margin.top/2})`)
        .attr("font-weight", "bold")
        .text(title);
    }
    
    /**
     * Create word usage visualization (word cloud)
     */
    createWordUsageViz() {
      const container = d3.select("#word-usage");
      
      container.append("h3")
        .text("Character Word Usage");
      
      // Create character selector
      const characterSelector = container.append("div")
        .attr("class", "character-selector");
      
      characterSelector.append("label")
        .attr("for", "word-usage-character")
        .text("Select character: ");
      
      const select = characterSelector.append("select")
        .attr("id", "word-usage-character")
        .on("change", () => {
          const selectedCharacter = select.property("value");
          this.updateWordCloud(selectedCharacter);
        });
      
      // Add options for main characters
      this.mainCharacters.slice(0, 5).forEach(character => {
        select.append("option")
          .attr("value", character.name)
          .text(character.name);
      });
      
      // Create word cloud container
      container.append("div")
        .attr("id", "word-cloud")
        .attr("width", 700)
        .attr("height", 400);
      
      // Initialize with first character
      this.updateWordCloud(this.mainCharacters[0].name);
    }
    
    /**
     * Update word cloud for selected character
     * @param {string} characterName - Selected character name
     */
    updateWordCloud(characterName) {
      const container = d3.select("#word-cloud");
      container.html(""); // Clear previous word cloud
      
      const characterData = this.dataProcessor.getCharacterData(characterName);
      if (!characterData) return;
      
      // Filter words by season if needed
      let wordData;
      if (this.currentSeason === "all") {
        wordData = characterData.topWords;
      } else {
        // This is a simplification - in a real app, you'd need to track words by season
        wordData = characterData.topWords;
      }
      
      // Use d3-cloud to create word cloud
      const width = 700;
      const height = 400;
      
      // Scale word sizes
      const fontScale = d3.scaleLinear()
        .domain([0, d3.max(wordData, d => d.value)])
        .range([12, 60]);
      
      // Create layout
      const layout = d3.layout.cloud()
        .size([width, height])
        .words(wordData)
        .padding(5)
        .rotate(() => 0)
        .fontSize(d => fontScale(d.value))
        .on("end", words => {
          // Create SVG for the word cloud
          const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height);
          
          // Create word elements
          svg.append("g")
            .attr("transform", `translate(${width/2},${height/2})`)
            .selectAll("text")
            .data(words)
            .enter().append("text")
            .style("font-size", d => `${d.size}px`)
            .style("fill", () => this.colorScale(characterName))
            .attr("text-anchor", "middle")
            .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
            .text(d => d.text)
            .on("mouseover", function(event, d) {
              d3.select(this).transition()
                .duration(200)
                .style("font-size", `${d.size * 1.2}px`);
              
              d3.select("#tooltip")
                .style("display", "block")
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px")
                .html(`<strong>${d.text}</strong><br>Used ${d.value} times`);
            })
            .on("mouseout", function(event, d) {
              d3.select(this).transition()
                .duration(200)
                .style("font-size", `${d.size}px`);
              
              d3.select("#tooltip").style("display", "none");
            });
        });
      
      // Run layout
      layout.start();
    }
    
    /**
     * Create character interaction network visualization
     */
    createInteractionNetwork() {
      const container = d3.select("#interaction-network");
      
      container.append("h3")
        .text("Character Interactions");
      
      // Create SVG for the network
      const svg = container.append("svg")
        .attr("width", 800)
        .attr("height", 600);
      
      this.networkSvg = svg;
      this.updateInteractionNetwork();
    }
    
    /**
     * Update interaction network for selected season
     */
    updateInteractionNetwork() {
      const svg = this.networkSvg;
      svg.selectAll("*").remove();
      
      // Get interaction data
      let data;
      if (this.currentSeason === "all") {
        data = this.dataProcessor.getInteractionData();
      } else {
        data = this.dataProcessor.getInteractionsBySeason(parseInt(this.currentSeason));
      }
      
      // Set up dimensions
      const width = +svg.attr("width");
      const height = +svg.attr("height");
      
      // Create force simulation
      const simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2));
      
      // Create link elements
      const links = svg.append("g")
        .selectAll("line")
        .data(data.links)
        .enter().append("line")
        .attr("stroke-width", d => Math.sqrt(d.value) / 2)
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6);
      
      // Create node elements
      const nodes = svg.append("g")
        .selectAll("circle")
        .data(data.nodes)
        .enter().append("circle")
        .attr("r", d => 10 + (d.value / 1000))
        .attr("fill", d => this.colorScale(d.id))
        .call(this.drag(simulation))
        .on("mouseover", function(event, d) {
          d3.select(this).transition()
            .duration(200)
            .attr("r", 10 + (d.value / 500));
          
          d3.select("#tooltip")
            .style("display", "block")
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")
            .html(`<strong>${d.id}</strong><br>Lines: ${d.value}`);
        })
        .on("mouseout", function(event, d) {
          d3.select(this).transition()
            .duration(200)
            .attr("r", 10 + (d.value / 1000));
          
          d3.select("#tooltip").style("display", "none");
        });
      
      // Add labels to nodes
      const labels = svg.append("g")
        .selectAll("text")
        .data(data.nodes)
        .enter().append("text")
        .text(d => d.id)
        .attr("font-size", 12)
        .attr("dx", 15)
        .attr("dy", 4);
      
      // Update positions on simulation tick
      simulation.on("tick", () => {
        links
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);
        
        nodes
          .attr("cx", d => d.x)
          .attr("cy", d => d.y);
        
        labels
          .attr("x", d => d.x)
          .attr("y", d => d.y);
      });
      
      // Add title
      const title = this.currentSeason === "all" 
        ? "Character Interactions (All Seasons)" 
        : `Character Interactions (Season ${this.currentSeason})`;
      
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${width/2},20)`)
        .attr("font-weight", "bold")
        .text(title);
    }
    
    /**
     * Create drag behavior for network nodes
     * @param {d3.forceSimulation} simulation - D3 force simulation
     * @returns {d3.drag} Drag behavior
     */
    drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }
  }