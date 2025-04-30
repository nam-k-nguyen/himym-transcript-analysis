/**
 * Data Processor for HIMYM Transcript Visualization
 * Handles parsing and transforming the CSV data into structures needed for visualization
 */

class DataProcessor {
    constructor() {
      this.rawData = null;
      this.episodes = new Map(); // Map of episode ID to episode info
      this.characters = new Map(); // Map of character name to character info
      this.interactions = new Map(); // Map of character pairs to interaction count
      this.seasons = new Map(); // Map of season number to season info
      this.wordUsage = new Map(); // Map of character to word usage
      this.stopWords = new Set(['the', 'and', 'a', 'to', 'of', 'in', 'i', 'you', 'it', 'that', 'is', 'was', 'for', 'on', 'are', 'with', 'as', 'this', 'be', 'at', 'have', 'but', 'not', 'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'use', 'an', 'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will', 'up', 'other', 'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like', 'him', 'into', 'time', 'has', 'look', 'two', 'more', 'go', 'see', 'no', 'way', 'could', 'my', 'than', 'been', 'call', 'who', 'its', 'now', 'find', 'long', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part']);
      this.isDataLoaded = false;
    }
  
    /**
     * Load and process the CSV data
     * @param {string} csvPath - Path to the CSV file
     * @returns {Promise} Promise that resolves when data is loaded and processed
     */
    async loadData(csvPath) {
      try {
        // Fetch the CSV file
        const response = await fetch(csvPath);
        const csvText = await response.text();
        
        // Parse CSV using PapaParse
        this.rawData = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true
        }).data;
        
        // Process the data
        this._processData();
        this.isDataLoaded = true;
        
        return {
          episodes: this.episodes,
          characters: this.characters,
          interactions: this.interactions,
          seasons: this.seasons
        };
      } catch (error) {
        console.error("Error loading or processing data:", error);
        throw error;
      }
    }
  
    /**
     * Process the raw CSV data into structured data for visualization
     * @private
     */
    _processData() {
      // Process each line of dialogue
      this.rawData.forEach((row, index) => {
        if (!row.episode || !row.name || !row.line) return;
        
        // Extract season and episode
        const match = row.episode.match(/(\d+)x(\d+)/);
        if (!match) return;
        
        const season = parseInt(match[1]);
        const episodeNum = parseInt(match[2]);
        const episodeId = `S${season}E${episodeNum}`;
        const episodeTitle = row.episode.split(' - ')[1] || '';
        
        // Process episode data
        this._processEpisode(episodeId, season, episodeNum, episodeTitle, row.name);
        
        // Process character data
        this._processCharacter(row.name, episodeId, season, row.line);
        
        // Process interactions (who speaks after whom)
        if (index > 0 && this.rawData[index - 1].episode === row.episode) {
          const prevCharacter = this.rawData[index - 1].name;
          if (prevCharacter !== row.name) {
            this._processInteraction(prevCharacter, row.name, episodeId, season);
          }
        }
      });
      
      // Process seasons summary
      this._processSeasons();
    }
  
    /**
     * Process episode data
     * @private
     */
    _processEpisode(episodeId, season, episodeNum, episodeTitle, character) {
      if (!this.episodes.has(episodeId)) {
        this.episodes.set(episodeId, {
          id: episodeId,
          season,
          episode: episodeNum,
          title: episodeTitle,
          characters: new Set(),
          lineCount: 0
        });
      }
      
      const episodeInfo = this.episodes.get(episodeId);
      episodeInfo.lineCount++;
      episodeInfo.characters.add(character);
    }
  
    /**
     * Process character data
     * @private
     */
    _processCharacter(character, episodeId, season, line) {
      if (!this.characters.has(character)) {
        this.characters.set(character, {
          name: character,
          lineCount: 0,
          wordCount: 0,
          episodeAppearances: new Set(),
          seasonAppearances: new Set(),
          words: new Map(),
          linesBySeason: new Map(),
          linesByEpisode: new Map()
        });
      }
      
      const characterInfo = this.characters.get(character);
      characterInfo.lineCount++;
      characterInfo.episodeAppearances.add(episodeId);
      characterInfo.seasonAppearances.add(season);
      
      // Track lines by season
      if (!characterInfo.linesBySeason.has(season)) {
        characterInfo.linesBySeason.set(season, 0);
      }
      characterInfo.linesBySeason.set(season, characterInfo.linesBySeason.get(season) + 1);
      
      // Track lines by episode
      if (!characterInfo.linesByEpisode.has(episodeId)) {
        characterInfo.linesByEpisode.set(episodeId, 0);
      }
      characterInfo.linesByEpisode.set(episodeId, characterInfo.linesByEpisode.get(episodeId) + 1);
      
      // Process words
      this._processWords(character, line);
    }
  
    /**
     * Process word usage
     * @private
     */
    _processWords(character, line) {
      const characterInfo = this.characters.get(character);
      
      const words = line
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 0);
      
      characterInfo.wordCount += words.length;
      
      words.forEach(word => {
        // Skip common English stop words
        if (this.stopWords.has(word)) return;
        
        characterInfo.words.set(word, (characterInfo.words.get(word) || 0) + 1);
      });
    }
  
    /**
     * Process character interactions
     * @private
     */
    _processInteraction(char1, char2, episodeId, season) {
      const interactionKey = [char1, char2].sort().join('|');
      
      if (!this.interactions.has(interactionKey)) {
        this.interactions.set(interactionKey, {
          characters: [char1, char2],
          count: 0,
          byEpisode: new Map(),
          bySeason: new Map()
        });
      }
      
      const interaction = this.interactions.get(interactionKey);
      interaction.count++;
      
      // Track by episode
      if (!interaction.byEpisode.has(episodeId)) {
        interaction.byEpisode.set(episodeId, 0);
      }
      interaction.byEpisode.set(episodeId, interaction.byEpisode.get(episodeId) + 1);
      
      // Track by season
      if (!interaction.bySeason.has(season)) {
        interaction.bySeason.set(season, 0);
      }
      interaction.bySeason.set(season, interaction.bySeason.get(season) + 1);
    }
  
    /**
     * Process seasons summary
     * @private
     */
    _processSeasons() {
      for (const episode of this.episodes.values()) {
        if (!this.seasons.has(episode.season)) {
          this.seasons.set(episode.season, {
            season: episode.season,
            episodeCount: 0,
            lineCount: 0,
            episodes: []
          });
        }
        
        const seasonInfo = this.seasons.get(episode.season);
        seasonInfo.episodeCount++;
        seasonInfo.lineCount += episode.lineCount;
        seasonInfo.episodes.push(episode.id);
      }
    }
  
    /**
     * Get main characters (those with most lines)
     * @param {number} limit - Number of characters to return
     * @returns {Array} Array of character objects
     */
    getMainCharacters(limit = 10) {
      return [...this.characters.values()]
        .sort((a, b) => b.lineCount - a.lineCount)
        .slice(0, limit)
        .map(char => ({
          name: char.name,
          lineCount: char.lineCount,
          wordCount: char.wordCount,
          episodeCount: char.episodeAppearances.size,
          seasonCount: char.seasonAppearances.size,
          linesBySeason: Object.fromEntries(char.linesBySeason),
          linesByEpisode: Object.fromEntries(char.linesByEpisode)
        }));
    }
  
    /**
     * Get character data by name
     * @param {string} name - Character name
     * @returns {Object} Character data
     */
    getCharacterData(name) {
      const char = this.characters.get(name);
      if (!char) return null;
      
      return {
        name: char.name,
        lineCount: char.lineCount,
        wordCount: char.wordCount,
        episodeCount: char.episodeAppearances.size,
        seasonCount: char.seasonAppearances.size,
        linesBySeason: Object.fromEntries(char.linesBySeason),
        linesByEpisode: Object.fromEntries(char.linesByEpisode),
        topWords: [...char.words.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 50)
          .map(([word, count]) => ({ text: word, value: count }))
      };
    }
  
    /**
     * Get interaction data for visualization
     * @returns {Object} Interaction data formatted for visualization
     */
    getInteractionData() {
      const nodes = this.getMainCharacters()
        .map(char => ({ id: char.name, group: 1, value: char.lineCount }));
      
      const links = [...this.interactions.values()]
        .map(interaction => ({
          source: interaction.characters[0],
          target: interaction.characters[1],
          value: interaction.count
        }));
      
      return { nodes, links };
    }
  
    /**
     * Get interactions by season
     * @param {number} season - Season number
     * @returns {Array} Interactions for the season
     */
    getInteractionsBySeason(season) {
      const nodes = this.getMainCharacters()
        .map(char => ({ id: char.name, group: 1, value: char.lineCount }));
      
      const links = [...this.interactions.values()]
        .filter(interaction => interaction.bySeason.has(season))
        .map(interaction => ({
          source: interaction.characters[0],
          target: interaction.characters[1],
          value: interaction.bySeason.get(season)
        }));
      
      return { nodes, links };
    }
  
    /**
     * Get word usage data for a character
     * @param {string} name - Character name
     * @returns {Array} Word usage data
     */
    getWordUsageData(name) {
      const char = this.characters.get(name);
      if (!char) return [];
      
      return [...char.words.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100)
        .map(([word, count]) => ({ text: word, value: count }));
    }
  
    /**
     * Get episode data by season
     * @param {number} season - Season number
     * @returns {Array} Episode data for the season
     */
    getEpisodesBySeason(season) {
      return [...this.episodes.values()]
        .filter(episode => episode.season === season)
        .sort((a, b) => a.episode - b.episode)
        .map(episode => ({
          id: episode.id,
          title: episode.title,
          lineCount: episode.lineCount,
          characterCount: episode.characters.size
        }));
    }
  
    /**
     * Get data about all seasons
     * @returns {Array} Season data
     */
    getSeasonData() {
      return [...this.seasons.values()]
        .sort((a, b) => a.season - b.season)
        .map(season => ({
          season: season.season,
          episodeCount: season.episodeCount,
          lineCount: season.lineCount
        }));
    }
  }