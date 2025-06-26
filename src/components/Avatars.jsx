import avatar1_cgl from '../assets/avatar1_cgl.png';
import avatar2_cgl from '../assets/avatar2_cgl.png';
import avatar3_cgl from '../assets/avatar3_cgl.png';
import avatar4_cgl from '../assets/avatar4_cgl.png';
import avatar5_cgl from '../assets/avatar5_cgl.png';
import avatar6_cgl from '../assets/avatar6_cgl.png';
import avatar7_cgl from '../assets/avatar7_cgl.png';
import avatar8_cgl from '../assets/avatar8_cgl.png';
import avatar9_cgl from '../assets/avatar9_cgl.png';
import avatar10_cgl from '../assets/avatar10_cgl.png';
import avatar11_cgl from '../assets/avatar11_cgl.png';
import avatar12_cgl from '../assets/avatar12_cgl.png';

function fallbackAvatar() {
    return <div className="bg-black w-full h-full items-center justify-center flex">hello</div>;
}

const avatars = [
    avatar1_cgl,
    avatar2_cgl,
    avatar3_cgl,
    avatar4_cgl,
    avatar5_cgl,
    avatar6_cgl,
    avatar7_cgl,
    avatar8_cgl,
    avatar9_cgl,
    avatar10_cgl,
    avatar11_cgl,
    avatar12_cgl,
];

export { avatars, fallbackAvatar };