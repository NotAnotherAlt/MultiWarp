import React from 'react';
import {FormattedMessage, injectIntl, intlShape, defineMessages} from 'react-intl';
import {connect} from 'react-redux';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import styles from './loader.css';
import {getIsLoadingWithId} from '../../reducers/project-state';
import topBlock from './top-block.svg';
import middleBlock from './middle-block.svg';
import bottomBlock from './bottom-block.svg';

const mainMessages = {
    'gui.loader.headline': (
        <FormattedMessage
            defaultMessage="Loading Project"
            description="Main loading message"
            id="gui.loader.headline"
        />
    ),
    'gui.loader.creating': (
        <FormattedMessage
            defaultMessage="Creating Project"
            description="Main creating message"
            id="gui.loader.creating"
        />
    )
};

const messages = defineMessages({
    projectData: {
        defaultMessage: 'Loading project …',
        description: 'Appears when loading project data, but not assets yet',
        id: 'tw.loader.projectData'
    },
    downloadingAssets: {
        defaultMessage: 'Downloading assets ({complete}/{total}) …',
        description: 'Appears when loading project assets from a project on a remote website',
        id: 'tw.loader.downloadingAssets'
    },
    loadingAssets: {
        defaultMessage: 'Loading assets ({complete}/{total}) …',
        description: 'Appears when loading project assets from a project file on the user\'s computer',
        id: 'tw.loader.loadingAssets'
    },
    loadingExtensions: {
        defaultMessage: 'Waiting for extensions ({count}) …',
        description: 'Appears when extensions are still loading after project assets finish loading',
        id: 'tw.loader.loadingExtensions'
    }
});

// Because progress events are fired so often during the very performance-critical loading
// process and React updates are very slow, we bypass React for updating the progress bar.

class LoaderComponent extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleAssetProgress',
            'handleProjectLoaded',
            'barInnerRef',
            'messageRef',
            'handleExtensionError',
            'updateExtensionLoadingStatus'
        ]);
        this.barInnerEl = null;
        this.messageEl = null;
        this.ignoreProgress = false;
        this.extensionLoadingWaitStartedAt = null;
        this.extensionLoadError = null;
    }
    componentDidMount () {
        this.handleAssetProgress(
            this.props.vm.runtime.finishedAssetRequests,
            this.props.vm.runtime.totalAssetRequests
        );
        this.props.vm.on('ASSET_PROGRESS', this.handleAssetProgress);
        this.props.vm.runtime.on('PROJECT_LOADED', this.handleProjectLoaded);
        window.addEventListener('error', this.handleExtensionError);
        this.extensionLoadingInterval = setInterval(this.updateExtensionLoadingStatus, 1000);
    }
    componentWillUnmount () {
        clearInterval(this.extensionLoadingInterval);
        window.removeEventListener('error', this.handleExtensionError);
        this.props.vm.off('ASSET_PROGRESS', this.handleAssetProgress);
        this.props.vm.runtime.off('PROJECT_LOADED', this.handleProjectLoaded);
    }
    handleExtensionError (event) {
        if (
            this.ignoreProgress ||
            !this.barInnerEl ||
            !this.messageEl ||
            this.props.vm.extensionManager.loadingAsyncExtensions <= 0 ||
            !event.filename ||
            !/^(?:data:|blob:|https?:)/.test(event.filename)
        ) {
            return;
        }

        let source = 'extension script';
        if (event.filename.startsWith('data:')) {
            source = `embedded extension (${event.filename.slice(0, event.filename.indexOf(','))})`;
        } else if (event.filename.startsWith('blob:')) {
            source = 'bundled extension (blob URL)';
        } else {
            try {
                const url = new URL(event.filename);
                source = `extension script (${url.hostname}${url.pathname})`;
            } catch (e) {
                source = 'extension script';
            }
        }
        const line = Number.isFinite(event.lineno) ? ` at line ${event.lineno}` : '';
        const column = Number.isFinite(event.colno) && event.colno > 0 ? `, column ${event.colno}` : '';
        const error = event.message || 'An extension script failed before registering.';
        this.extensionLoadError = error;
        this.messageEl.textContent = `${source} error${line}${column}: ${this.extensionLoadError}`;
    }
    updateExtensionLoadingStatus () {
        if (this.ignoreProgress || this.extensionLoadError || !this.barInnerEl || !this.messageEl) {
            return;
        }

        const {finishedAssetRequests, totalAssetRequests} = this.props.vm.runtime;
        const pendingExtensions = this.props.vm.extensionManager.loadingAsyncExtensions;
        if (
            totalAssetRequests === 0 ||
            finishedAssetRequests < totalAssetRequests ||
            pendingExtensions <= 0
        ) {
            this.extensionLoadingWaitStartedAt = null;
            return;
        }

        if (this.extensionLoadingWaitStartedAt === null) {
            this.extensionLoadingWaitStartedAt = Date.now();
            return;
        }
        if (Date.now() - this.extensionLoadingWaitStartedAt < 5000) {
            return;
        }

        this.messageEl.textContent = this.props.intl.formatMessage(messages.loadingExtensions, {
            count: pendingExtensions
        });
    }
    handleAssetProgress (finished, total) {
        if (total === 0) {
            this.extensionLoadingWaitStartedAt = null;
            this.extensionLoadError = null;
        }
        if (this.ignoreProgress || this.extensionLoadError || !this.barInnerEl || !this.messageEl) {
            return;
        }

        if (total === 0) {
            // Started loading a new project.
            this.barInnerEl.style.width = '0';
            this.messageEl.textContent = this.props.intl.formatMessage(messages.projectData);
        } else {
            this.barInnerEl.style.width = `${finished / total * 100}%`;
            const message = this.props.isRemote ? messages.downloadingAssets : messages.loadingAssets;
            this.messageEl.textContent = this.props.intl.formatMessage(message, {
                complete: finished,
                total
            });
        }
    }
    handleProjectLoaded () {
        if (this.ignoreProgress || !this.barInnerEl || !this.messageEl) {
            return;
        }

        this.ignoreProgress = true;
        this.props.vm.runtime.resetProgress();
    }
    barInnerRef (barInner) {
        this.barInnerEl = barInner;
    }
    messageRef (message) {
        this.messageEl = message;
    }
    render () {
        return (
            <div
                className={classNames(styles.background, {
                    [styles.fullscreen]: this.props.isFullScreen
                })}
            >
                <div className={styles.container}>
                    <div className={styles.blockAnimation}>
                        <img
                            className={styles.topBlock}
                            src={topBlock}
                            draggable={false}
                        />
                        <img
                            className={styles.middleBlock}
                            src={middleBlock}
                            draggable={false}
                        />
                        <img
                            className={styles.bottomBlock}
                            src={bottomBlock}
                            draggable={false}
                        />
                    </div>

                    <div className={styles.title}>
                        {mainMessages[this.props.messageId]}
                    </div>

                    <div
                        className={styles.message}
                        ref={this.messageRef}
                    />

                    <div className={styles.barOuter}>
                        <div
                            className={styles.barInner}
                            ref={this.barInnerRef}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

LoaderComponent.propTypes = {
    intl: intlShape,
    isFullScreen: PropTypes.bool,
    isRemote: PropTypes.bool,
    messageId: PropTypes.string,
    vm: PropTypes.shape({
        on: PropTypes.func,
        off: PropTypes.func,
        extensionManager: PropTypes.shape({
            loadingAsyncExtensions: PropTypes.number
        }),
        runtime: PropTypes.shape({
            totalAssetRequests: PropTypes.number,
            finishedAssetRequests: PropTypes.number,
            resetProgress: PropTypes.func,
            on: PropTypes.func,
            off: PropTypes.func
        })
    })
};
LoaderComponent.defaultProps = {
    isFullScreen: false,
    messageId: 'gui.loader.headline'
};

const mapStateToProps = state => ({
    isRemote: getIsLoadingWithId(state.scratchGui.projectState.loadingState),
    vm: state.scratchGui.vm
});

const mapDispatchToProps = () => ({});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(injectIntl(LoaderComponent));
