import formidable from 'formidable';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Ensure the temporary upload directory exists
  const tmpUploadDir = path.join(process.cwd(), 'tmp');
  await fs.promises.mkdir(tmpUploadDir, { recursive: true });

  const form = formidable({
    uploadDir: tmpUploadDir,
    keepExtensions: true,
    maxFileSize: 200 * 1024 * 1024,
  });

  let imageId; // Declare imageId outside try block
  let newImageEntry; // Declare newImageEntry outside try block
  let imagesFilePath; // Declare imagesFilePath outside try block

  try {
    const [fields, files] = await form.parse(req);
    const imageFile = files.image?.[0];
    const title = fields.title?.[0];
    const description = fields.description?.[0];

    if (!imageFile || !title) {
      return res.status(400).json({ message: 'Image file and title are required.' });
    }

    imageId = Date.now().toString(); // Assign value
    const outputDir = path.join(process.cwd(), 'public', 'tiled-images', imageId);
    const tileSourcePath = `/tiled-images/${imageId}/${imageId}.dzi`;

    // Ensure output directory exists
    await fs.promises.mkdir(outputDir, { recursive: true });

    // Process image to DZI tiles using sharp
    const dziOutputPath = path.join(outputDir, imageId + '.dzi');
    console.log('Processing image to DZI:', imageFile.filepath);
    console.log('DZI output directory:', outputDir);
    console.log('DZI output file path:', dziOutputPath);

    // Verify output directory creation
    const outputDirExists = await fs.promises.access(outputDir, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);
    console.log(`Output directory ${outputDir} exists: ${outputDirExists}`);

    try {
      // --- Debugging sharp output ---
      const testOutputPath = path.join(outputDir, 'test_output.jpg');
      console.log('Attempting to write a test JPG to:', testOutputPath);
      await sharp(imageFile.filepath)
        .resize(500) // Resize to make it small and quick
        .jpeg({ quality: 80 })
        .toFile(testOutputPath);
      console.log('Successfully wrote test JPG.');
      await fs.promises.unlink(testOutputPath); // Clean up test file
      console.log('Successfully deleted test JPG.');
      // --- End Debugging sharp output ---

      console.log('Attempting DZI tiling with sharp...');
      const sharpOutputMetadata = await sharp(imageFile.filepath)
        .tile({
          size: 256, // Tile size
          layout: 'dz', // Deep Zoom format
          id: imageId,
        })
        .toFile(path.join(outputDir, imageId)); // Corrected: pass base path, sharp adds .dzi and _files
      console.log('Sharp DZI tiling completed successfully. Output metadata:', sharpOutputMetadata);
    } catch (sharpError) {
      console.error('Sharp processing failed:', sharpError);
      throw new Error(`Image tiling failed: ${sharpError.message}`); // Re-throw to be caught by main try/catch
    }

    // --- Debugging write permissions ---
    const dummyFilePath = path.join(outputDir, 'dummy.txt');
    try {
      await fs.promises.writeFile(dummyFilePath, 'This is a test file.', 'utf-8');
      console.log(`Successfully wrote dummy file to: ${dummyFilePath}`);
      await fs.promises.unlink(dummyFilePath); // Clean up dummy file
      console.log(`Successfully deleted dummy file: ${dummyFilePath}`);
    } catch (dummyWriteError) {
      console.error(`Failed to write dummy file to ${outputDir}:`, dummyWriteError);
      throw new Error(`Permissions error: Cannot write to output directory. ${dummyWriteError.message}`);
    }
    // --- End Debugging write permissions ---

    console.log('Checking if DZI file exists after sharp processing...');
    const fileExists = await fs.promises.access(dziOutputPath, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);
    console.log(`DZI file ${dziOutputPath} exists: ${fileExists}`);

    // Update data/images.js (for prototype)
    newImageEntry = { // Assign value
      id: imageId,
      title: title,
      description: description || '',
      tileSource: tileSourcePath,
    };

    console.log('Defining imagesFilePath...');
    imagesFilePath = path.join(process.cwd(), 'data', 'images.js');
    let currentContent = await fs.promises.readFile(imagesFilePath, 'utf-8');

    // Extract the array string (everything between [ and ])
    const arrayStartMatch = currentContent.match(/export const spaceImages = \[/
);
    const arrayEndIndex = currentContent.lastIndexOf(']');

    if (!arrayStartMatch || arrayEndIndex === -1) {
        throw new Error("Could not parse spaceImages array in images.js");
    }

    const arrayString = currentContent.substring(arrayStartMatch.index + arrayStartMatch[0].length - 1, arrayEndIndex + 1);

    // Parse the array string into a JavaScript array
    let currentImagesArray;
    try {
        currentImagesArray = eval(arrayString); // This is risky in production, but fine for prototype
    } catch (e) {
        throw new Error(`Failed to parse images.js array: ${e.message}. Please ensure data/images.js is valid JavaScript array syntax.`);
    }

    // Add the new entry
    currentImagesArray.push(newImageEntry);

    // Stringify the array back to a JavaScript array string
    const updatedArrayString = JSON.stringify(currentImagesArray, null, 2)
        .replace(/^[\[]/, '[\n  ') // Add newline and indent after opening bracket
        .replace(/[\]]$/, '\n]'); // Add newline before closing bracket

    // Reconstruct the entire file content
    const finalContent = `export const spaceImages = ${updatedArrayString};\n`;

    console.log('Attempting to write to:', imagesFilePath);
    console.log('Content to write:', finalContent);

    await fs.promises.writeFile(imagesFilePath, finalContent, 'utf-8');

    console.log('Successfully wrote to:', imagesFilePath);

    // Clean up temporary uploaded file
    await fs.promises.unlink(imageFile.filepath);

    res.status(200).json({ message: 'Image uploaded and processed successfully!', imageId: imageId });
  } catch (error) {
    console.error('Upload error in API:', error); // Log the full error object
    res.status(500).json({ message: 'Image upload and processing failed.', error: error.toString() }); // Use error.toString() for response
  }
}