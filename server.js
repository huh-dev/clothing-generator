/// <reference types="@citizenfx/server" />
/// <reference types="image-js" />

const imagejs = require('image-js');
const fs = require('fs');
const webp = require('webp-converter');

const resName = GetCurrentResourceName();
const mainSavePath = `resources/${resName}/images`;

try {
	if (!fs.existsSync(mainSavePath)) {
		fs.mkdirSync(mainSavePath);
	}

	onNet('takeScreenshot', async (filename, type) => {
		const savePath = `${mainSavePath}/${type}`;
		if (!fs.existsSync(savePath)) {
			fs.mkdirSync(savePath);
		}

		exports['screenshot-basic'].requestClientScreenshot(
			source,
			{
				fileName: 'temp.png',
				encoding: 'png',
				quality: 1.0,
			},
			async (err, tempFileName) => {
				try {
					// Load the image
					let image = await imagejs.Image.load(tempFileName);
					const croppedImage = image.crop({ x: Math.floor(image.width / 4.5), width: image.height });

					// Process green screen
					for (let x = 0; x < croppedImage.width; x++) {
						for (let y = 0; y < croppedImage.height; y++) {
							const pixelArr = croppedImage.getPixelXY(x, y);
							const r = pixelArr[0];
							const g = pixelArr[1];
							const b = pixelArr[2];

							if (g > r + b) {
								croppedImage.setPixelXY(x, y, [255, 255, 255, 0]);
							}
						}
					}

					// Save as temporary PNG first
					const tempPngPath = `${savePath}/temp_${filename}.png`;
					await croppedImage.save(tempPngPath);

					// Convert to WebP
					const webpPath = `${savePath}/${filename}.webp`;
					await webp.cwebp(tempPngPath, webpPath, "-q 80 -alpha_q 100");

					// Clean up temporary files
					fs.unlinkSync(tempPngPath);
					fs.unlinkSync(tempFileName);

				} catch (error) {
					console.error('Error processing image:', error);
				}
			}
		);
	});
} catch (error) {
	console.error(error.message);
}
