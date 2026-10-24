import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Instances from './pages/Instances'
import CreateInstance from './pages/CreateInstance'
import InstanceDetail from './pages/InstanceDetail'
import Profiles from './pages/Profiles'
import Discover from './pages/Discover'
import Settings from './pages/Settings'
import Worlds from './pages/Worlds'
import Library from './pages/Library'
import Downloads from './pages/Downloads'
import Servers from './pages/Servers'
import Screenshots from './pages/Screenshots'
import Skins from './pages/Skins'
import Placeholder from './pages/Placeholder'

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/discover" element={<Discover projectType="mod" title="Discover" />} />
      <Route path="/mods" element={<Discover projectType="mod" title="Mods" />} />
      <Route path="/modpacks" element={<Discover projectType="modpack" title="Modpacks" />} />
      <Route path="/resource-packs" element={<Discover projectType="resourcepack" title="Resource Packs" />} />
      <Route path="/shaders" element={<Discover projectType="shader" title="Shader Packs" />} />
      <Route path="/worlds" element={<Worlds />} />
      <Route path="/servers" element={<Servers />} />
      <Route path="/screenshots" element={<Screenshots />} />
      <Route path="/library" element={<Library />} />
      <Route path="/downloads" element={<Downloads />} />
      <Route path="/instances" element={<Instances />} />
      <Route path="/instances/create" element={<CreateInstance />} />
      <Route path="/instances/:id" element={<InstanceDetail />} />
      <Route path="/fabric" element={<Placeholder title="Fabric" />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/profiles" element={<Profiles />} />
      <Route path="/skins" element={<Skins />} />
    </Routes>
  )
}