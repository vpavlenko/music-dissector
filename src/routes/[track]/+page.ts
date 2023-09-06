import JSZip from 'JSZip'

export async function load({ fetch, params }) {
  const response = await fetch('https://vpavlenko-all-in-one.hf.space/file=/home/user/app/gradio_cached_examples/10/Compressed%20Files/c617188cf976a125ce9918dfb255523862a09443/kult-0-100.zip', { cache: 'force-cache' });
  const archiveBuffer = await response.arrayBuffer();

  const zip = new JSZip();

  const loadedZip = await zip.loadAsync(archiveBuffer);
  const json =  JSON.parse(await loadedZip.files['dissector.json'].async('string'))

  // @ts-ignore
  window.loadedZip = loadedZip  
  // @ts-ignore
  console.log(window.loadedZip.files)

  
  return json;

  // const url = `https://taejun-allinone-demo.s3.ap-northeast-2.amazonaws.com/data/${params.track}.json.gz`
  // try {

  //   return DATA
  // }
  // catch (error) {
  //   console.log(error)
  // }
}
