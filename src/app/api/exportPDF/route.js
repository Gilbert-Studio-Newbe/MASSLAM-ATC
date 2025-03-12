import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";

export async function POST(request) {
  try {
    // Parse the request body
    const data = await request.json();
    const { config, dimensions, bays, analysis } = data;
    
    if (!config || !dimensions || !bays) {
      return NextResponse.json(
        { error: "Missing required configuration data" },
        { status: 400 }
      );
    }
    
    // Generate PDF
    const doc = generatePDFReport(config, dimensions, bays, analysis);
    
    // Convert PDF to base64
    const pdfData = doc.output("datauristring");
    
    return NextResponse.json({ 
      success: true,
      pdfData
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

/**
 * Generate a PDF report of the timber structure
 */
function generatePDFReport(config, dimensions, bays, analysis) {
  // Create a new PDF document
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.text("Timber Structure Report", 105, 15, { align: "center" });
  
  // Add date
  doc.setFontSize(10);
  const date = new Date().toLocaleDateString();
  doc.text(`Generated on: ${date}`, 105, 22, { align: "center" });
  
  // Add configuration details
  doc.setFontSize(14);
  doc.text("Configuration", 14, 35);
  
  doc.setFontSize(12);
  doc.text(`Occupancy Type: ${config.occupancyType} (${config.loadFactor} kN/m²)`, 14, 45);
  doc.text(`Fire Resistance Level: ${config.buildingFRL}`, 14, 52);
  doc.text(`Floors: ${dimensions.numFloors}`, 14, 59);
  doc.text(`Concrete Topping: ${config.concrete}`, 14, 66);
  
  // Add member dimensions
  doc.setFontSize(14);
  doc.text("Member Dimensions", 14, 80);
  
  doc.setFontSize(12);
  doc.text(`Joists: ${dimensions.joistsWidth} x ${dimensions.joistsHeight} mm (${config.timberGradeJoists})`, 14, 90);
  doc.text(`Beams: ${dimensions.beamsWidth} x ${dimensions.beamsHeight} mm (${config.timberGradeBeams})`, 14, 97);
  doc.text(`Posts: ${dimensions.postWidth} x ${dimensions.postDepth} mm (${config.timberGradePosts})`, 14, 104);
  
  // Add bay dimensions
  doc.setFontSize(14);
  doc.text("Bay Dimensions", 14, 120);
  
  doc.setFontSize(12);
  doc.text(`Horizontal Bays: ${bays.horizontalBayCount}`, 14, 130);
  doc.text(`Vertical Bays: ${bays.verticalBayCount}`, 14, 137);
  doc.text(`Total Horizontal Length: ${bays.totalHorizontalLength} mm`, 14, 144);
  doc.text(`Total Vertical Length: ${bays.totalVerticalLength} mm`, 14, 151);
  
  // Add analysis results if available
  if (analysis) {
    let yPos = 165;
    
    doc.setFontSize(14);
    doc.text("Analysis Results", 14, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    if (analysis.totalTimberVolume) {
      doc.text(`Total Timber Volume: ${analysis.totalTimberVolume.toFixed(2)} m³`, 14, yPos);
      yPos += 7;
    }
    
    if (analysis.timberWeight) {
      doc.text(`Timber Weight: ${analysis.timberWeight.toFixed(2)} kg`, 14, yPos);
      yPos += 7;
    }
    
    if (analysis.carbonStorage) {
      doc.text(`Carbon Storage: ${analysis.carbonStorage.toFixed(2)} tonnes CO₂e`, 14, yPos);
      yPos += 7;
    }
    
    if (analysis.embodiedCarbon) {
      doc.text(`Embodied Carbon: ${analysis.embodiedCarbon.toFixed(2)} tonnes CO₂e`, 14, yPos);
      yPos += 7;
    }
    
    if (analysis.carbonSavings) {
      doc.text(`Carbon Savings (vs. steel/concrete): ${analysis.carbonSavings.toFixed(2)} tonnes CO₂e`, 14, yPos);
      yPos += 7;
    }
    
    if (analysis.cost) {
      doc.text(`Estimated Cost: $${analysis.cost.toFixed(2)}`, 14, yPos);
      yPos += 7;
    }
  }
  
  return doc;
}
