/**
 * Main application script for HIMYM Transcript Visualization
 */

// Wait for the DOM to load
document.addEventListener("DOMContentLoaded", () => {
    // Show loading indicator
    const loadingIndicator = document.getElementById("loading");
    loadingIndicator.style.display = "block";
    
    // Initialize data processor
    const dataProcessor = new DataProcessor();
    
    // Load data and initialize visualizations
    dataProcessor.loadData("himym_full_transcripts.csv")
      .then(() => {
        console.log("Data loaded successfully");
        
        // Initialize visualizations
        const visualizations = new Visualizations(dataProcessor);
        visualizations.initialize();
        
        // Hide loading indicator
        loadingIndicator.style.display = "none";
      })
      .catch(error => {
        console.error("Error loading data:", error);
        
        // Show error message
        loadingIndicator.style.display = "none";
        document.getElementById("error-message").textContent = 
          "Error loading data. Please check the console for details.";
        document.getElementById("error-message").style.display = "block";
      });
  });