// src/pages/VideoPage.tsx
// Video Pipeline — standalone page, always pre-set. No workspace creation needed.

import { Layout } from '@/components/Layout';
import { VideoWorkspace } from '@/components/video/VideoWorkspace';

const VideoPage = () => (
    <Layout>
        <VideoWorkspace workspaceName="Video Pipeline" />
    </Layout>
);

export default VideoPage;
