/**
 * Copyright (C) 2021 Thomas Weber
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {compose} from 'redux';
import {FormattedMessage, defineMessages, injectIntl, intlShape} from 'react-intl';
import {getIsLoading} from '../reducers/project-state.js';
import AppStateHOC from '../lib/app-state-hoc.jsx';
import ErrorBoundaryHOC from '../lib/error-boundary-hoc.jsx';
import TWProjectMetaFetcherHOC from '../lib/tw-project-meta-fetcher-hoc.jsx';
import TWStateManagerHOC from '../lib/tw-state-manager-hoc.jsx';
import SBFileUploaderHOC from '../lib/sb-file-uploader-hoc.jsx';
import TWPackagerIntegrationHOC from '../lib/tw-packager-integration-hoc.jsx';
import SettingsStore from '../addons/settings-store-singleton';
import downloadBlob from '../lib/download-blob.js';
import AddonSettings from '../addons/settings/settings.jsx';
import '../lib/tw-fix-history-api';
import GUI from './render-gui.jsx';
import MenuBar from '../components/menu-bar/menu-bar.jsx';
import Description from '../components/tw-description/description.jsx';
import BrowserModal from '../components/browser-modal/browser-modal.jsx';
import CloudVariableBadge from '../containers/tw-cloud-variable-badge.jsx';
import TWWindchimeSubmitter from '../containers/tw-windchime-submitter.jsx';
import {isBrowserSupported} from '../lib/tw-environment-support-prober';
import AddonChannels from '../addons/channels';
import {loadServiceWorker} from './load-service-worker';
import runAddons from '../addons/entry';
import InvalidEmbed from '../components/tw-invalid-embed/invalid-embed.jsx';
import {APP_NAME} from '../lib/brand.js';

import styles from './interface.css';
import './mobile-preview.css';

const isInvalidEmbed = window.parent !== window;

const messages = defineMessages({
    defaultTitle: {
        defaultMessage: 'Run Scratch projects faster',
        description: 'Title of homepage',
        id: 'tw.guiDefaultTitle'
    }
});

const WrappedMenuBar = compose(
    SBFileUploaderHOC,
    TWPackagerIntegrationHOC
)(MenuBar);

if (AddonChannels.reloadChannel) {
    AddonChannels.reloadChannel.addEventListener('message', () => {
        location.reload();
    });
}

if (AddonChannels.changeChannel) {
    AddonChannels.changeChannel.addEventListener('message', e => {
        SettingsStore.setStoreWithVersionCheck(e.data);
    });
}

runAddons();

const Footer = () => (
    <footer className={styles.footer}>
        <div className={styles.footerContent}>
            <div className={styles.footerText}>
                <FormattedMessage
                    // eslint-disable-next-line max-len
                    defaultMessage="{APP_NAME} is not affiliated with Scratch, the Scratch Team, or the Scratch Foundation."
                    description="Disclaimer that TurboWarp is not connected to Scratch"
                    id="tw.footer.disclaimer"
                    values={{
                        APP_NAME
                    }}
                />
            </div>

            <div className={styles.footerText}>
                <FormattedMessage
                    // eslint-disable-next-line max-len
                    defaultMessage="Scratch is a project of the Scratch Foundation. It is available for free at {scratchDotOrg}."
                    description="A disclaimer that Scratch requires when referring to Scratch. {scratchDotOrg} is a link with text 'https://scratch.org/'"
                    id="tw.footer.scratchDisclaimer"
                    values={{
                        scratchDotOrg: (
                            <a
                                href="https://scratch.org/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                {'https://scratch.org/'}
                            </a>
                        )
                    }}
                />
            </div>

            <div className={styles.footerColumns}>
                <div className={styles.footerSection}>
                    <a href="credits.html">
                        <FormattedMessage
                            defaultMessage="Credits"
                            description="Credits link in footer"
                            id="tw.footer.credits"
                        />
                    </a>
                </div>
                <div className={styles.footerSection}>
                    <a href="https://desktop.turbowarp.org/">
                        {/* Do not translate */}
                        {'TurboWarp Desktop'}
                    </a>
                    <a href="https://packager.turbowarp.org/">
                        {/* Do not translate */}
                        {'TurboWarp Packager'}
                    </a>
                    <a href="https://docs.turbowarp.org/embedding">
                        <FormattedMessage
                            defaultMessage="Embedding"
                            description="Link in footer to embedding documentation for embedding link"
                            id="tw.footer.embed"
                        />
                    </a>
                    <a href="https://docs.turbowarp.org/url-parameters">
                        <FormattedMessage
                            defaultMessage="URL Parameters"
                            description="Link in footer to URL parameters documentation"
                            id="tw.footer.parameters"
                        />
                    </a>
                    <a href="https://docs.turbowarp.org/">
                        <FormattedMessage
                            defaultMessage="Documentation"
                            description="Link in footer to additional documentation"
                            id="tw.footer.documentation"
                        />
                    </a>
                </div>
                <div className={styles.footerSection}>
                    <a
                        href="https://scratch.mit.edu/studios/51827619/comments"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <FormattedMessage
                            defaultMessage="Feedback & Bugs"
                            description="Link to feedback/bugs page"
                            id="tw.feedback"
                        />
                    </a>
                    <a href="https://github.com/TurboWarp/">
                        <FormattedMessage
                            defaultMessage="Source Code"
                            description="Link to source code"
                            id="tw.code"
                        />
                    </a>
                    <a href="privacy.html">
                        <FormattedMessage
                            defaultMessage="Privacy Policy"
                            description="Link to privacy policy"
                            id="tw.privacy"
                        />
                    </a>
                </div>
            </div>
        </div>
    </footer>
);

class Interface extends React.Component {
    constructor (props) {
        super(props);
        this.handleUpdateProjectTitle = this.handleUpdateProjectTitle.bind(this);
        this.handleClickAddonSettings = this.handleClickAddonSettings.bind(this);
        this.handleCloseAddonSettings = this.handleCloseAddonSettings.bind(this);
        this.handleAddonSettingsAnimationEnd = this.handleAddonSettingsAnimationEnd.bind(this);
        this.handleAddonSettingsPanelClick = this.handleAddonSettingsPanelClick.bind(this);
        this.handleAddonSettingsExport = this.handleAddonSettingsExport.bind(this);
        this.handlePageTransitionEnd = this.handlePageTransitionEnd.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.state = {
            addonSettingsOpen: false,
            addonSettingsClosing: false,
            addonSettingsInitialSearch: '',
            lastPlayerOnly: props.isPlayerOnly,
            pageTransitioning: false
        };
    }
    static getDerivedStateFromProps (props, state) {
        if (props.isPlayerOnly !== state.lastPlayerOnly) {
            return {
                lastPlayerOnly: props.isPlayerOnly,
                pageTransitioning: true
            };
        }
        return null;
    }
    componentDidMount () {
        document.addEventListener('keydown', this.handleKeyDown);
    }
    componentDidUpdate (prevProps) {
        if (prevProps.isLoading && !this.props.isLoading) {
            loadServiceWorker();
        }
    }
    componentWillUnmount () {
        document.removeEventListener('keydown', this.handleKeyDown);
    }
    handleClickAddonSettings (addonId) {
        this.setState({
            addonSettingsOpen: true,
            addonSettingsClosing: false,
            addonSettingsInitialSearch: typeof addonId === 'string' ? addonId : ''
        });
    }
    handleCloseAddonSettings () {
        if (this.state.addonSettingsOpen) {
            this.setState({addonSettingsClosing: true});
        }
    }
    handleAddonSettingsAnimationEnd (event) {
        if (event.target === event.currentTarget && this.state.addonSettingsClosing) {
            this.setState({
                addonSettingsOpen: false,
                addonSettingsClosing: false
            });
        }
    }
    handleKeyDown (event) {
        if (event.key === 'Escape') {
            this.handleCloseAddonSettings();
        }
    }
    handleAddonSettingsPanelClick (event) {
        event.stopPropagation();
    }
    handlePageTransitionEnd (event) {
        if (event.target === event.currentTarget && this.state.pageTransitioning) {
            this.setState({pageTransitioning: false});
        }
    }
    handleAddonSettingsExport (settings) {
        const blob = new Blob([JSON.stringify(settings)]);
        downloadBlob('turbowarp-addon-settings.json', blob);
    }
    handleUpdateProjectTitle (title, isDefault) {
        if (isDefault || !title) {
            document.title = `${APP_NAME} - ${this.props.intl.formatMessage(messages.defaultTitle)}`;
        } else {
            document.title = `${title} - ${APP_NAME}`;
        }
    }
    render () {
        if (isInvalidEmbed) {
            return <InvalidEmbed />;
        }

        const {
            /* eslint-disable no-unused-vars */
            intl,
            hasCloudVariables,
            description,
            isFullScreen,
            isLoading,
            isPlayerOnly,
            isRtl,
            projectId,
            /* eslint-enable no-unused-vars */
            ...props
        } = this.props;
        const isHomepage = isPlayerOnly && !isFullScreen;
        const isEditor = !isPlayerOnly;
        return (
            <div
                className={classNames(styles.container, 'multiwarp-app', {
                    [styles.playerOnly]: isHomepage,
                    [styles.editor]: isEditor,
                    [styles.pageTransitioning]: this.state.pageTransitioning
                })}
                onAnimationEnd={this.handlePageTransitionEnd}
                dir={isRtl ? 'rtl' : 'ltr'}
            >
                <TWWindchimeSubmitter />
                {isHomepage ? (
                    <div className={styles.menu}>
                        <WrappedMenuBar
                            canChangeLanguage
                            canManageFiles
                            canChangeTheme
                            enableSeeInside
                            onClickAddonSettings={this.handleClickAddonSettings}
                        />
                    </div>
                ) : null}
                <div
                    className={styles.center}
                    style={isPlayerOnly ? ({
                        // + 2 accounts for 1px border on each side of the stage
                        width: `${Math.max(480, props.customStageSize.width) + 2}px`
                    }) : null}
                >
                    <GUI
                        onClickAddonSettings={this.handleClickAddonSettings}
                        onUpdateProjectTitle={this.handleUpdateProjectTitle}
                        backpackVisible
                        backpackHost="_local_"
                        {...props}
                    />
                    {isHomepage ? (
                        <React.Fragment>
                            {isBrowserSupported() ? null : (
                                <BrowserModal isRtl={isRtl} />
                            )}
                            {hasCloudVariables && projectId !== '0' && (
                                <div className={styles.section}>
                                    <CloudVariableBadge />
                                </div>
                            )}
                            {description.instructions || description.credits ? (
                                <div className={styles.section}>
                                    <Description
                                        instructions={description.instructions}
                                        credits={description.credits}
                                        projectId={projectId}
                                    />
                                </div>
                            ) : null}
                        </React.Fragment>
                    ) : null}
                </div>
                {isHomepage && <Footer />}
                {this.state.addonSettingsOpen && (
                    <div
                        className={classNames(styles.addonSettingsOverlay, {
                            [styles.addonSettingsOverlayClosing]: this.state.addonSettingsClosing
                        })}
                        onAnimationEnd={this.handleAddonSettingsAnimationEnd}
                        onClick={this.handleCloseAddonSettings}
                    >
                        <div
                            className={classNames(styles.addonSettingsPanel, {
                                [styles.addonSettingsPanelClosing]: this.state.addonSettingsClosing
                            })}
                            role="dialog"
                            aria-modal="true"
                            aria-label="Add-on settings"
                            onClick={this.handleAddonSettingsPanelClick}
                        >
                            <AddonSettings
                                initialSearch={this.state.addonSettingsInitialSearch}
                                preserveHash
                                onClose={this.handleCloseAddonSettings}
                                onExportSettings={this.handleAddonSettingsExport}
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    }
}

Interface.propTypes = {
    intl: intlShape,
    hasCloudVariables: PropTypes.bool,
    customStageSize: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number
    }),
    description: PropTypes.shape({
        credits: PropTypes.string,
        instructions: PropTypes.string
    }),
    isFullScreen: PropTypes.bool,
    isLoading: PropTypes.bool,
    isPlayerOnly: PropTypes.bool,
    isRtl: PropTypes.bool,
    projectId: PropTypes.string
};

const mapStateToProps = state => ({
    hasCloudVariables: state.scratchGui.tw.hasCloudVariables,
    customStageSize: state.scratchGui.customStageSize,
    description: state.scratchGui.tw.description,
    isFullScreen: state.scratchGui.mode.isFullScreen,
    isLoading: getIsLoading(state.scratchGui.projectState.loadingState),
    isPlayerOnly: state.scratchGui.mode.isPlayerOnly,
    isRtl: state.locales.isRtl,
    projectId: state.scratchGui.projectState.projectId
});

const mapDispatchToProps = () => ({});

const ConnectedInterface = injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(Interface));

const WrappedInterface = compose(
    AppStateHOC,
    ErrorBoundaryHOC('TW Interface'),
    TWProjectMetaFetcherHOC,
    TWStateManagerHOC,
    TWPackagerIntegrationHOC
)(ConnectedInterface);

export default WrappedInterface;
