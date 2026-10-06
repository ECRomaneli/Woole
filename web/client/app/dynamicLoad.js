async function scanDirectory(path, componentFiles = []) {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path) || path.startsWith('//') || path.includes('..')) {
        throw new Error(`Invalid directory path: ${path}`)
    }

    if (!path.endsWith('/')) { path += '/' }

    const response = await fetch(path)

    if (!response.ok) { throw new Error(`Failed to load directory: ${path}`) }
        
    const parser = new DOMParser()
    const doc = parser.parseFromString(await response.text(), 'text/html')
    const links = doc.getElementsByTagName('a')
    
    for (const link of links) {
        const href = link.getAttribute('href')
        if (href === '../' || href === './' || href === '/' || !href) { continue }
        if (/^[a-z][a-z0-9+.-]*:\/\//i.test(href) || href.startsWith('//') || href.includes('..')) { continue }
        
        if (href.endsWith('.js')) {
            componentFiles.push({ path: `${path}${href}`, name: href })
        } else if (href.endsWith('/')) {
            await scanDirectory(`${path}${href}`, componentFiles)
        }
    }

    return componentFiles
}

async function loadScripts(path) {
    return await Promise.all((await scanDirectory(path)).map(file => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = file.path
            script.onload = resolve
            script.onerror = reject
            document.body.appendChild(script)
        })
    }))
}