import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const imagesFilePath = path.join(process.cwd(), 'data', 'images.js');
      const fileContent = await fs.promises.readFile(imagesFilePath, 'utf-8');

      // Extract the array string from the file content
      const arrayStartMatch = fileContent.match(/export const spaceImages = \[/);
      const arrayEndIndex = fileContent.lastIndexOf(']');

      if (!arrayStartMatch || arrayEndIndex === -1) {
        throw new Error("Could not parse spaceImages array in images.js");
      }

      const arrayString = fileContent.substring(arrayStartMatch.index + arrayStartMatch[0].length - 1, arrayEndIndex + 1);

      // Parse the array string into a JavaScript array
      let imagesArray;
      try {
        imagesArray = eval(arrayString); // Risky in production, but consistent with upload API
      } catch (e) {
        throw new Error(`Failed to parse images.js array: ${e.message}. Please ensure data/images.js is valid JavaScript array syntax.`);
      }

      res.status(200).json(imagesArray);
    } catch (error) {
      console.error('Error fetching images:', error);
      res.status(500).json({ message: 'Failed to fetch images', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
